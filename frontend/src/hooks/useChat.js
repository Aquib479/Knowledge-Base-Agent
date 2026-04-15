import { useState, useCallback, useRef, useEffect } from "react";
import { askStream } from "../api";
import { addMessage, getMessages } from "../utils/indexedDB";

export function useChat(threadId) {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false); // true while retrieving, before first token
  const [streaming, setStreaming] = useState(false); // true while tokens are flowing
  const abortRef = useRef(null); // lets us cancel mid-stream

  // Load messages when thread changes
  useEffect(() => {
    if (threadId) {
      loadMessagesForThread(threadId);
    } else {
      setMessages([]);
    }
  }, [threadId]);

  const loadMessagesForThread = useCallback(async (id) => {
    try {
      const loadedMessages = await getMessages(id);
      // Filter to only include user and assistant messages (not internal metadata)
      const filteredMessages = loadedMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        text: msg.text,
        sources: msg.sources || [],
        confidence: msg.confidence,
      }));
      setMessages(filteredMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    }
  }, []);

  const ask = useCallback(
    async (question) => {
      if (!question.trim() || !threadId) return;

      // Cancel any in-flight stream before starting a new one
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // 1. Add the user message
      const userMsg = { id: Date.now(), role: "user", text: question };
      setMessages((prev) => [...prev, userMsg]);

      // Save user message to IndexedDB
      await addMessage(threadId, {
        role: "user",
        text: question,
      });

      setThinking(true);

      // 2. Add an empty assistant message — we'll fill it token by token
      const assistantId = Date.now() + 1;
      const assistantMsg = {
        id: assistantId,
        role: "assistant",
        text: "",
        sources: [],
      };
      setMessages((prev) => [...prev, assistantMsg]);

      let finalAssistantMsg = { ...assistantMsg };

      try {
        await askStream(question, {
          signal: controller.signal,

          // Called first — confidence from retrieval scores
          onConfidence: (confidence) => {
            finalAssistantMsg.confidence = confidence;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, confidence } : m,
              ),
            );
          },

          // Called once — sources arrive before the first token
          onSources: (sources) => {
            finalAssistantMsg.sources = sources;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)),
            );
          },

          // Called per token — append to the existing assistant message
          onToken: (token) => {
            // First token means retrieval is done — hide the thinking indicator
            setThinking(false);
            setStreaming(true);

            finalAssistantMsg.text += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + token } : m,
              ),
            );
          },
        });

        // Save complete assistant message to IndexedDB
        await addMessage(threadId, {
          role: "assistant",
          text: finalAssistantMsg.text,
          sources: finalAssistantMsg.sources,
          confidence: finalAssistantMsg.confidence,
        });
      } catch (e) {
        if (e.name === "AbortError") return; // user cancelled — no error shown

        // Replace the empty assistant message with an error message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, role: "error", text: e.message } : m,
          ),
        );
      } finally {
        setThinking(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [threadId],
  );

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setThinking(false);
    setStreaming(false);
  }, []);

  // Expose streaming so the UI can show a cursor while tokens flow
  return { messages, thinking, streaming, ask, clear };
}
