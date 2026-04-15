from ingestion import get_embedder, get_collection
from reranker import rerank

CANDIDATE_MULTIPLIER = 3

def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """
    Two-stage retrieval pipeline

    step 1 => Bi-encoder (fast, approximate)
            Embed the question, fetch top candidate_k chunks from ChromaDB
            using cosine similarity. This is the same as before, just fetching
            more candidates (top_k * 3 instead of just top_k).

    step 2 => Cross-encoder (slower, precise)
            Re-score all candidates by reading question + chunk together.
            Return only the top_k highest-scoring chunks.

    Why fetch more than you need?
      Bi-encoder similarity is approximate — the truly relevant chunk
      might be ranked #8 by cosine similarity but #1 by the cross-encoder.
      Fetching 15 candidates (for top_k=5) gives the re-ranker enough
      material to find the real gems that embedding search might have missed.

    Returns list of chunk dicts with both scores:
      - score:            cross-encoder score (sigmoid normalised, 0-1)
      - bi_encoder_score: original cosine similarity (0-1)
    """
    """
    Embed the question and retrieve the top_k most relevant chunks.
    Returns list of { text, filename, doc_id, chunk_index, distance }
    """
    embedder = get_embedder()
    collection = get_collection()

    total_chunks = collection.count()
    if total_chunks == 0:
        return []
    
    # Stage 1: fetch more candidates than we need for final answer
    candidate_k = min(top_k * CANDIDATE_MULTIPLIER, total_chunks)

    question_embedding = embedder.encode([query], show_progress_bar=False).tolist()

    results = collection.query(
        query_embeddings=question_embedding,
        n_results=candidate_k,
        include=["documents", "metadatas", "distances"]
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    chunks = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        chunks.append({
            "text": doc,
            "filename": meta.get("filename", "unknown"),
            "doc_id": meta.get("doc_id", ""),
            "chunk_index": meta.get("chunk_index", 0),
            "score": round(1-dist, 4),
        })
        
    # Stage 2: cross-encoder re-ranks candidates, returns top_k
    return rerank(query, chunks, top_k=top_k)