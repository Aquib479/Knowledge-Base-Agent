import { useState, useEffect } from "react";

const BASE = "/api";

async function fetchHistory() {
  const res = await fetch(`${BASE}/eval/history`);
  if (!res.ok) throw new Error("Failed to load eval history");
  return res.json();
}

export default function EvalDashboard({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchHistory()
      .then(setData)
      .catch(() => setData({ runs: [] }))
      .finally(() => setLoading(false));
  }, []);

  const runs = data?.runs || [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border-2)",
          borderRadius: 12,
          width: "90%",
          maxWidth: 720,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "DM Mono",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: 2,
              }}
            >
              RAGAS EVAL HISTORY
            </p>
            <p
              style={{
                fontFamily: "Instrument Serif",
                fontSize: 20,
                fontStyle: "italic",
                color: "var(--text)",
                marginTop: 2,
              }}
            >
              Pipeline Quality
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-3)",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "DM Mono",
                  fontSize: 12,
                  color: "var(--text-3)",
                }}
              >
                loading...
              </p>
            </div>
          )}

          {!loading && runs.length === 0 && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "Instrument Serif",
                  fontSize: 18,
                  fontStyle: "italic",
                  color: "var(--text-2)",
                }}
              >
                No eval runs yet
              </p>
              <p
                style={{
                  fontFamily: "DM Mono",
                  fontSize: 11,
                  color: "var(--text-3)",
                  marginTop: 8,
                }}
              >
                POST to /eval with test questions to start tracking quality
              </p>
            </div>
          )}

          {/* Latest scores summary */}
          {!loading && runs.length > 0 && (
            <>
              <p
                style={{
                  fontFamily: "DM Mono",
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                LATEST RUN — {runs[0].timestamp}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  marginBottom: 24,
                }}
              >
                <ScoreCard
                  label="Faithfulness"
                  value={runs[0].scores?.faithfulness}
                  desc="Not hallucinating"
                />
                <ScoreCard
                  label="Ans. Relevancy"
                  value={runs[0].scores?.answer_relevancy}
                  desc="On-topic answers"
                />
                <ScoreCard
                  label="Context Recall"
                  value={runs[0].scores?.context_recall}
                  desc="Retrieval quality"
                />
              </div>
            </>
          )}

          {/* Run history */}
          {!loading && runs.length > 0 && (
            <>
              <p
                style={{
                  fontFamily: "DM Mono",
                  fontSize: 10,
                  color: "var(--text-3)",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                ALL RUNS ({runs.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {runs.map((run, i) => (
                  <RunRow
                    key={run.run_id}
                    run={run}
                    isLatest={i === 0}
                    expanded={expanded === run.run_id}
                    onToggle={() =>
                      setExpanded(expanded === run.run_id ? null : run.run_id)
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, desc }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const color =
    pct == null
      ? "var(--text-3)"
      : pct >= 80
        ? "var(--accent)"
        : pct >= 60
          ? "#c8a84a"
          : "var(--red)";

  return (
    <div
      style={{
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
      }}
    >
      <p
        style={{ fontSize: 22, fontFamily: "DM Mono", color, marginBottom: 4 }}
      >
        {pct != null ? `${pct}%` : "—"}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "var(--text)",
          fontFamily: "Geist",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "DM Mono" }}
      >
        {desc}
      </p>
    </div>
  );
}

function RunRow({ run, isLatest, expanded, onToggle }) {
  const scores = run.scores || {};
  const avg = Object.values(scores)
    .filter((v) => v != null)
    .reduce((a, b, _, arr) => a + b / arr.length, 0);
  const avgPct = Math.round(avg * 100);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLatest && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "DM Mono",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: 3,
                padding: "1px 5px",
              }}
            >
              LATEST
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontFamily: "DM Mono",
              color: "var(--text-2)",
            }}
          >
            {run.timestamp}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: "DM Mono",
              color: "var(--text-3)",
            }}
          >
            {run.num_questions}q
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <MiniScore label="F" value={scores.faithfulness} />
          <MiniScore label="R" value={scores.answer_relevancy} />
          <MiniScore label="C" value={scores.context_recall} />
          <span
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              transform: expanded ? "rotate(180deg)" : "none",
              display: "inline-block",
              transition: "transform 0.2s",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Per-question breakdown */}
      {expanded && run.per_question?.length > 0 && (
        <div
          style={{ borderTop: "1px solid var(--border)", padding: "12px 14px" }}
        >
          {run.per_question.map((q, i) => (
            <div
              key={i}
              style={{
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom:
                  i < run.per_question.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text)",
                  fontFamily: "Geist",
                  marginBottom: 4,
                }}
              >
                Q: {q.question}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <MiniScore label="Faithful" value={q.faithfulness} />
                <MiniScore label="Relevant" value={q.answer_relevancy} />
                <MiniScore label="Recall" value={q.context_recall} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniScore({ label, value }) {
  const pct = value != null ? Math.round(value * 100) : null;
  const color =
    pct == null
      ? "var(--text-3)"
      : pct >= 80
        ? "var(--accent)"
        : pct >= 60
          ? "#c8a84a"
          : "var(--red)";
  return (
    <span style={{ fontSize: 10, fontFamily: "DM Mono", color }}>
      {label} {pct != null ? `${pct}%` : "—"}
    </span>
  );
}
