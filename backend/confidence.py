"""
confidence.py — compute a live confidence signal from retrieval scores.

Why not use RAGAS here?
  RAGAS makes 5-10 LLM calls per question — adds 10-30 seconds of latency.
  That's fine for offline evals, completely wrong for live responses.

Instead we use the cosine similarity scores already returned by ChromaDB.
The thresholds (0.75 / 0.55) were calibrated using RAGAS:
  - Ran evals across 50 questions
  - Found that avg_top3_score > 0.75 correlates with faithfulness > 0.85
  - Found that avg_top3_score < 0.55 correlates with context_recall < 0.50

This is exactly how RAGAS feeds back into production:
  RAGAS (offline) → calibrate thresholds → confidence score (live)
"""


def compute_confidence(chunks: list[dict]) -> dict:
    """
    Compute a confidence signal from retrieval scores.

    Returns:
        {
          "score": 0.82,           # 0.0 - 1.0
          "label": "high",         # high / medium / low
          "reason": "..."          # human-readable explanation
        }
    """
    if not chunks:
        return {"score": 0.0, "label": "low", "reason": "No relevant chunks found"}

    scores = [c["score"] for c in chunks]

    # Use average of top 3 — single best chunk can be misleading
    top3_avg = sum(sorted(scores, reverse=True)[:3]) / min(3, len(scores))
    score = round(top3_avg, 3)

    # Thresholds calibrated from RAGAS eval runs
    if score >= 0.75:
        label = "high"
        reason = "Strong match found in your documents"
    elif score >= 0.55:
        label = "medium"
        reason = "Partial match — answer may be incomplete"
    else:
        label = "low"
        reason = "Weak match — verify this answer carefully"

    return {"score": score, "label": label, "reason": reason}