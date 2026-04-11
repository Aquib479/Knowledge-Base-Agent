from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ingestion import ingest_document, delete_document, list_documents
from retrieval import retrieve
from generation import generate_answer, stream_answer

app = FastAPI(title="Knowledge Base Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------- Model -----------

class AskRequest(BaseModel):
    question: str
    top_k: int = 5

class AskResponse(BaseModel):
    answer: str
    sources: list[dict]


# ----------- Routes -----------

@app.get("/")
def health():
    return {"status": "ok", "message": "Knowledge Base Agent is running"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Ingest a PDF into the knowledge base."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
    try:
        result = ingest_document(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    
    return result


@app.post("/ask", response_model=AskResponse)
async def ask_questions(request: AskRequest):
    """Retrieve relevant chunks and generate an answer."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    try:
        chunks = retrieve(request.question, top_k=request.top_k)
        answer = generate_answer(request.question, chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # format source for frontend
    sources = [
        {
            "filename": c["filename"],
            "preview": c["text"][:200] + ("..." if len(c["text"]) > 200 else ""),
            "score": c["score"],
            "doc_id": c["doc_id"],
            "chunk_index": c["chunk_index"],
        }
        for c in chunks
    ]

    return AskResponse(answer=answer, sources=sources)


@app.post("/ask/stream")
async def ask_stream(body: AskRequest):
    """
    Streaming version of /ask.
    Returns a text/event-stream response — the browser receives
    tokens one by one as the LLM generates them.
 
    SSE event sequence:
      1. {type: "sources", sources: [...]}  — sent immediately
      2. {type: "token",   text: "..."}     — one per LLM token
      3. {type: "done"}                     — signals stream end
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
 
    try:
        chunks = retrieve(body.question, top_k=body.top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
    return StreamingResponse(
        stream_answer(body.question, chunks),
        media_type="text/event-stream",
        headers={
            # Prevent nginx / any proxy from buffering the stream
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


@app.get("/documents")
def get_documents():
    """List all ingested documents."""
    try:
        docs = list_documents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"documents": docs}


@app.delete("/documents/{doc_id}")
def remove_document(doc_id: str):
    """Delete a document and all its chunks."""
    try:
        count = delete_document(doc_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
    if count == 0:
        raise HTTPException(status_code=404, detail="Document not found.")
 
    return {"deleted": True, "chunks_removed": count}