import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow({
  messages,
  thinking,
  streaming,
  onAsk,
  onClear,
  docCount,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const submit = () => {
    const q = input.trim();
    if (!q || thinking) return;
    onAsk(q);
    setInput("");
    textareaRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 22,
              color: "var(--text)",
              fontStyle: "italic",
            }}
          >
            Ask your knowledge base
          </h1>
          <p
            style={{
              fontSize: 11,
              fontFamily: "DM Mono",
              color: "var(--text-3)",
              marginTop: 2,
            }}
          >
            {docCount} document{docCount !== 1 ? "s" : ""} indexed
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            style={{
              fontSize: 11,
              fontFamily: "DM Mono",
              color: "var(--text-3)",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "var(--text)";
              e.target.style.borderColor = "var(--border-2)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "var(--text-3)";
              e.target.style.borderColor = "var(--border)";
            }}
          >
            clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 16px" }}>
        {isEmpty && <EmptyState docCount={docCount} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              index={i}
              isStreaming={
                streaming &&
                i === messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))}

          {thinking && <ThinkingIndicator />}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "var(--bg-2)",
            border: "1px solid var(--border-2)",
            borderRadius: 12,
            padding: "10px 10px 10px 16px",
            transition: "border-color 0.2s",
          }}
          onFocusCapture={(e) =>
            (e.currentTarget.style.borderColor = "var(--border-2)")
          }
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={onKeyDown}
            placeholder={
              docCount === 0
                ? "Upload a PDF first..."
                : "Ask anything about your documents..."
            }
            disabled={docCount === 0 || thinking}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text)",
              fontFamily: "Geist",
              fontSize: 14,
              lineHeight: 1.6,
              resize: "none",
              overflow: "hidden",
              minHeight: 24,
            }}
          />
          <button
            onClick={submit}
            disabled={!input.trim() || thinking || streaming || docCount === 0}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              flexShrink: 0,
              background:
                input.trim() && !thinking && !streaming && docCount > 0
                  ? "var(--accent)"
                  : "var(--border)",
              border: "none",
              cursor:
                input.trim() && !thinking && !streaming && docCount > 0
                  ? "pointer"
                  : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
              fontSize: 14,
            }}
          >
            {thinking || streaming ? (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid var(--bg-3)",
                  borderTopColor: "var(--text-2)",
                  borderRadius: "50%",
                  animation: "spin-slow 0.7s linear infinite",
                }}
              />
            ) : (
              "↑"
            )}
          </button>
        </div>
        <p
          style={{
            fontSize: 10,
            fontFamily: "DM Mono",
            color: "var(--text-3)",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          enter to send · shift+enter for newline
        </p>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontFamily: "DM Mono",
          letterSpacing: 1.5,
          color: "var(--text-3)",
        }}
      >
        AGENT
      </span>
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "2px 12px 12px 12px",
          padding: "14px 18px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--text-3)",
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ docCount }) {
  const prompts = [
    "What are the main topics covered in my documents?",
    "Summarize the key points from the uploaded docs",
    "What does the documentation say about authentication?",
    "Find everything related to deployment",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 32,
        textAlign: "center",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "Instrument Serif",
            fontSize: 32,
            color: "var(--text)",
            fontStyle: "italic",
            marginBottom: 8,
            opacity: 0.9,
          }}
        >
          What do you want to know?
        </p>
        <p
          style={{
            fontSize: 13,
            fontFamily: "DM Mono",
            color: "var(--text-3)",
          }}
        >
          {docCount === 0
            ? "Upload PDFs from the sidebar to get started"
            : `${docCount} document${docCount !== 1 ? "s" : ""} ready — ask anything`}
        </p>
      </div>

      {docCount > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "100%",
            maxWidth: 480,
          }}
        >
          {prompts.map((p, i) => (
            <SuggestionPill key={i} text={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionPill({ text }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 16px",
        fontSize: 12,
        fontFamily: "Geist",
        color: "var(--text-2)",
        cursor: "default",
        textAlign: "left",
        background: "var(--bg-2)",
      }}
    >
      {text}
    </div>
  );
}
