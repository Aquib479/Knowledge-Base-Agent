"""
reranker.py — cross-encoder re-ranking of retrieved chunks.
 
Model: cross-encoder/ms-marco-MiniLM-L-6-v2
  - Trained on MS MARCO passage ranking dataset
  - Specifically designed for question → passage relevance scoring
  - Small and fast (~80MB) — runs on CPU in ~50ms for 15 passages
  - Returns a raw logit score (not 0-1, but higher = more relevant)
 
Why this model specifically?
  MS MARCO is a dataset of real search queries and their relevant passages.
  A model trained on it understands "does this passage answer this question?"
  at a much deeper level than cosine similarity between embeddings.
 
The cross-encoder never needs to see your documents ahead of time —
it scores at query time, which is why we can use it as a second stage
without rebuilding any index.
"""

from sentence_transformers import CrossEncoder

_reranker = None
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

def get_reranker():
    global _reranker
    if _reranker is None:
        # Downloads ~80MB on first run, cached locally after that
        _reranker = CrossEncoder(RERANKER_MODEL)
    return _reranker


def rerank(query: str, chunks : list[dict], top_k: int = 5) -> list[dict]:
    """
    Re-score chunks using a cross-encoder and return the top_k most relevant.
 
    How it works:
      1. Build (question, chunk_text) pairs
      2. Cross-encoder scores each pair — reads both together
      3. Sort by cross-encoder score descending
      4. Return top_k
 
    The score from the cross-encoder is a raw logit — it can be any real
    number (e.g. -8.2 to +12.4). Higher always means more relevant.
    We normalise it to 0-1 using sigmoid so it's comparable to bi-encoder
    scores in the confidence badge.
 
    Args:
        question: the user's query
        chunks:   list of chunk dicts from the bi-encoder retriever
        top_k:    how many to return after re-ranking
 
    Returns:
        Same chunk dicts, sorted by cross-encoder score, with
        'score' replaced by the sigmoid-normalised cross-encoder score
        and 'bi_encoder_score' preserving the original cosine similarity.
    """
    
    if not chunks:
        return chunks
    
    reranker = get_reranker()

    # Build input pairs — cross-encoder reads question + passage together
    pairs = [(query, chunk["text"]) for chunk in chunks]

    # scores is a numpy array of raw logits, one per pair
    scores = reranker.predict(pairs, show_progress_bar=False)

    # Attach cross-encoder score to each chunk
    # Preserve original bi-encoder score for transparency
    scored_chunks = []
    for chunk, raw_score in zip(chunks, scores):
        scored_chunks.append({
            **chunk,
            "bi_encoder_score": chunk["score"],     # original cosine similarity
            "score": _sigmoid(float(raw_score)),    # normalised cross-encoder score
            "raw_rerank_score": round(float(raw_score), 4),
        })
 
    # Sort by cross-encoder score — this is the re-ranking step
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
 
    return scored_chunks[:top_k]


 
def _sigmoid(x: float) -> float:
    """
    Normalise a raw logit to 0-1.
    sigmoid(0) = 0.5, sigmoid(10) ≈ 1.0, sigmoid(-10) ≈ 0.0
    """
    import math
    return round(1 / (1 + math.exp(-x)), 4)
