import re
import uuid
from pathlib import Path
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb



# ------------ singletons resources ------------
_embedder = None
_chroma_client = None
_collection = None

CHROMA_PATH = "./chroma_store"
COLLECTION_NAME = "knowledge_base"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150


def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer('all-MiniLM-L6-v2')
    return _embedder


def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME, 
            metadata={"hnsw:space": "cosine"},
        )
    return _collection



# ------------ PDF parcing ------------

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from PDF bytes."""
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    return "\n".join(pages)

def clean_text(text: str) -> str:
    """Basic text cleaning — remove control chars, collapse whitespace."""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()

def split_into_sentence(text: str) -> list[str]:
    """Split text into sentences using a simple regex."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks by word count,
    respecting sentence boundaries where possible.
    """
    sentences = split_into_sentence(text)
    chunks = []
    current_words = []
    current_words_count = 0

    for sentence in sentences:
        words = sentence.split()
        if current_words_count + len(words) > chunk_size and current_words:
            chunks.append(" ".join(current_words))

            # keep overlap
            overlap_words = current_words[-overlap:] if overlap < len(current_words) else current_words[:]
            current_words = overlap_words + words
            current_words_count = len(current_words)
        else:
            current_words.extend(words)
            current_words_count += len(words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


# ---------- embedding + storage ----------

def ingest_document(file_bytes: bytes, filename: str) -> dict:
    """
    Full ingestion pipeline:
    PDF bytes → text → clean → chunk → embed → store in ChromaDB
    Returns metadata about what was stored.
    """

    # unique ID for this document
    doc_id = str(uuid.uuid4())   

    # 1. extract text from PDF
    raw_text = extract_text_from_pdf(file_bytes)    

    # 2. clean the extracted text
    clean = clean_text(raw_text)     
    if not clean:
        raise ValueError("Could not extract any text from this PDF.")
    
    # 3. split the cleaned text into chunks for embedding
    chunks = chunk_text(clean)      
    if not chunks:
        raise ValueError("No chunks produced from documents.")
    
    # 4. embed the chunks using SentenceTransformer
    embedder = get_embedder()
    collection = get_collection()

    embeddings = embedder.encode(chunks, show_progress_bar=False).tolist()

    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"doc_id": doc_id, "filename": filename, "chunk_index": i} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=chunks
    )

    return {
        "doc_id": doc_id,
        "filename": filename,
        "chunks_stored": len(chunks),
        "char_count": len(clean),
    }


def delete_document(doc_id: str) -> int:
    """Delete all chunks belonging to a document. Returns count deleted."""
    collections = get_collection()
    results = collections.get(where={"doc_id": doc_id})
    ids = results.get("ids", [])
    if ids:
        collections.delete(ids=ids)
    return len(ids)
    

def list_documents() -> list[dict]:
    """Return a deduplicated list of ingested documents with chunk counts."""
    collection = get_collection()
    results = collection.get(include=["metadatas"])
    metadatas = results.get("metadatas") or []
 
    docs: dict[str, dict] = {}
    for meta in metadatas:
        doc_id = meta["doc_id"]
        if doc_id not in docs:
            docs[doc_id] = {
                "doc_id": doc_id,
                "filename": meta["filename"],
                "chunk_count": 0,
            }
        docs[doc_id]["chunk_count"] += 1
 
    return list(docs.values())
 
