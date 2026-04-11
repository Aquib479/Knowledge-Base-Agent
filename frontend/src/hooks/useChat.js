import { useState, useCallback, useRef } from "react";
import { askStream } from "../api";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false); // true while retrieving, before first token
  const [streaming, setStreaming] = useState(false); // true while tokens are flowing
  const abortRef = useRef(null); // lets us cancel mid-stream

  const ask = useCallback(async (question) => {
    if (!question.trim()) return;

    // Cancel any in-flight stream before starting a new one
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 1. Add the user message
    const userMsg = { id: Date.now(), role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
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

    try {
      await askStream(question, {
        signal: controller.signal,

        // Called once — sources arrive before the first token
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources } : m)),
          );
        },

        // Called per token — append to the existing assistant message
        onToken: (token) => {
          // First token means retrieval is done — hide the thinking indicator
          setThinking(false);
          setStreaming(true);

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, text: m.text + token } : m,
            ),
          );
        },
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
  }, []);

  const clear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setThinking(false);
    setStreaming(false);
  }, []);

  // Expose streaming so the UI can show a cursor while tokens flow
  return { messages, thinking, streaming, ask, clear };
}
