/**
 * ConfidenceBadge — shows how well the retriever matched this question.
 *
 * This is RAGAS made visible to the user.
 * The score and thresholds come from offline RAGAS eval runs (confidence.py).
 * We're not running RAGAS live — we're showing the retrieval signal
 * that RAGAS taught us to trust.
 */
export default function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;

  const colors = {
    high: { bg: "#0e1a0e", border: "var(--accent)", text: "var(--accent)" },
    medium: { bg: "#1a150a", border: "#c8a84a", text: "#c8a84a" },
    low: { bg: "#1a0e0e", border: "var(--red)", text: "var(--red)" },
  };

  const c = colors[confidence.label] || colors.medium;
  const pct = Math.round(confidence.score * 100);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        padding: "5px 10px",
        marginBottom: 6,
      }}
    >
      {/* Score bar */}
      <div
        style={{
          width: 48,
          height: 4,
          borderRadius: 2,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: c.border,
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 10,
          fontFamily: "DM Mono",
          color: c.text,
          letterSpacing: 0.5,
        }}
      >
        {pct}% · {confidence.label} confidence
      </span>

      {/* Reason tooltip on hover */}
      <span
        title={confidence.reason}
        style={{
          fontSize: 10,
          color: "var(--text-3)",
          cursor: "help",
          lineHeight: 1,
        }}
      >
        ⓘ
      </span>
    </div>
  );
}
