import { useState } from "react";

export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  const score = Math.round(source.score * 100);

  const scoreColor =
    score >= 80
      ? "var(--accent)"
      : score >= 60
        ? "var(--blue)"
        : "var(--text-2)";

  return (
    <div
      className={`fade-up fade-up-delay-${Math.min(index + 1, 3)}`}
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--bg-2)",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--border-2)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--border)")
      }
    >
      {/* Source header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          cursor: "pointer",
          background: "var(--bg-3)",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--border)",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontFamily: "DM Mono",
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-2)",
              fontFamily: "DM Mono",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {source.filename}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontFamily: "DM Mono",
              color: scoreColor,
            }}
          >
            {score}%
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              transition: "transform 0.2s",
              display: "inline-block",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Passage preview */}
      {expanded && (
        <div style={{ padding: "10px 12px" }}>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              fontFamily: "Geist",
              lineHeight: 1.7,
            }}
          >
            {source.preview}
          </p>
        </div>
      )}
    </div>
  );
}
