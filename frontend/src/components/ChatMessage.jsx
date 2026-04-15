import SourceCard from "./SourceCard";
import ConfidenceBadge from "./ConfidenceBadge";

export default function ChatMessage({ message, index, isStreaming }) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <div
      className="fade-up"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 10,
        animationDelay: `${index * 0.04}s`,
      }}
    >
      {/* Role label */}
      <span
        style={{
          fontSize: 9,
          fontFamily: "DM Mono",
          letterSpacing: 1.5,
          color: isUser
            ? "var(--accent-dim)"
            : isError
              ? "var(--red)"
              : "var(--text-3)",
        }}
      >
        {isUser ? "YOU" : isError ? "ERROR" : "AGENT"}
      </span>

      {!isUser && !isError && (
        <ConfidenceBadge confidence={message.confidence} />
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: "78%",
          background: isUser
            ? "var(--bg-3)"
            : isError
              ? "#1a0e0e"
              : "var(--bg-2)",
          border: `1px solid ${isUser ? "var(--border-2)" : isError ? "var(--red)" : "var(--border)"}`,
          borderRadius: isUser ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
          padding: "14px 16px",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: isError ? "var(--red)" : "var(--text)",
            fontFamily: "Geist",
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
          }}
        >
          {message.text}
          {/* Blinking cursor — only shown on the actively streaming message */}
          {isStreaming && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "1em",
                background: "var(--accent)",
                marginLeft: 2,
                verticalAlign: "text-bottom",
                animation: "pulse-dot 0.8s ease-in-out infinite",
              }}
            />
          )}
        </p>
      </div>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div
          style={{
            width: "78%",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: "DM Mono",
              letterSpacing: 1.5,
              color: "var(--text-3)",
              marginBottom: 2,
            }}
          >
            SOURCES — {message.sources.length} PASSAGES
          </span>
          {message.sources.map((src, i) => (
            <SourceCard key={i} source={src} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
