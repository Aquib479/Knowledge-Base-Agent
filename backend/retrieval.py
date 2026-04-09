from ingestion import get_embedder, get_collection

def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """
    Embed the question and retrieve the top_k most relevant chunks.
    Returns list of { text, filename, doc_id, chunk_index, distance }
    """
    embedder = get_embedder()
    collection = get_collection()

    question_embedding = embedder.encode([query], show_progress_bar=False).tolist()

    results = collection.query(
        query_embeddings=question_embedding,
        n_results=min(top_k, collection.count() or 1),
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
        
    return chunks