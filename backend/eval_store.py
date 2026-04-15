"""
eval_store.py — lightweight JSON-based persistence for eval runs.
 
Why not a database?
For a personal/learning project, a flat JSON file is perfect.
It's human-readable, zero setup, and you can open it in any editor
to see exactly what your pipeline scored over time.
 
Structure of eval_history.json:
[
  {
    "run_id": "2024-01-15T10:30:00",
    "timestamp": "2024-01-15T10:30:00",
    "scores": {
      "faithfulness": 0.87,
      "answer_relevancy": 0.91,
      "context_recall": 0.78
    },
    "per_question": [
      {
        "question": "What is RAG?",
        "ground_truth": "RAG stands for...",
        "answer": "RAG is...",
        "faithfulness": 0.9,
        "answer_relevancy": 0.95,
        "context_recall": 0.8
      }
    ],
    "num_questions": 3
  }
]
"""

import json
from pathlib import Path
from datetime import datetime

STORE_PATH = Path("./eval_history.json")

def load_all() -> list[dict]:
    if not STORE_PATH.exists():
        return []
    try:
        return json.loads(STORE_PATH.read_text())
    except (json.JSONDecodeError, IOError):
        return []
    

def save_run(scores: dict, per_question: list[dict]) -> dict:
    """
    Persist one eval run. Returns the saved record.
    scores = {"faithfulness": 0.87, "answer_relevancy": 0.91, ...}
    """
    timestamp = datetime.utcnow().isoformat(timespec="seconds")
    record = {
        "run_id": timestamp,
        "timestamp": timestamp,
        "scores": scores,
        "per_question": per_question,
        "num_questions": len(per_question),
    }
 
    history = load_all()
    history.append(record)
    STORE_PATH.write_text(json.dumps(history, indent=2))
 
    return record


def load_history() -> list[dict]:
    """Return all eval runs, newest first."""
    runs = load_all()
    return list(reversed(runs))
 
 
def load_latest() -> dict | None:
    """Return the most recent eval run, or None."""
    runs = load_all()
    return runs[-1] if runs else None