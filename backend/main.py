from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from confidence import compute_confidence
from ingestion import ingest_document, delete_document, list_documents
from retrieval import retrieve
from generation import generate_answer, stream_answer
from eval import run_evaluation
from eval_store import load_history, load_latest

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

class TestCase(BaseModel):
    question: str
    ground_truth: str

class EvalRequest(BaseModel):
    test_cases: list[TestCase]


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

    confidence is computed from retrieval scores — instant, no LLM call needed.
    Thresholds were calibrated using RAGAS eval runs (see confidence.py).
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
 
    try:
        chunks = retrieve(body.question, top_k=body.top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    confidence = compute_confidence(chunks)
 
    return StreamingResponse(
        stream_answer(body.question, chunks, confidence),
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


@app.post("/eval")
async def run_eval(request: EvalRequest):
    """
    Run RAGAS evaluation over a set of question/ground_truth pairs.
 
    How to use (in the /docs UI):
      1. Upload some PDFs first
      2. Write 3-10 questions you know the answers to from those PDFs
      3. POST them here with their reference answers as ground_truth
      4. Get back faithfulness, answer_relevancy, and context_recall scores
 
    This takes 20-60 seconds depending on test set size —
    each metric requires several LLM judge calls per question.
    """
    if not request.test_cases:
        raise HTTPException(status_code=400, detail="test_cases must not be empty.")
    if len(request.test_cases) > 20:
        raise HTTPException(status_code=400, detail="Max 20 test cases per run.")
    
    try:
        result = run_evaluation([tc.model_dump() for tc in request.test_cases])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
    return result


@app.get("/eval/history")
def get_eval_history():
    """
    Return all past eval runs, newest first.
    Use this to track how your pipeline improves over time —
    e.g. before and after changing chunk size or top_k.
    """
    try:
        history = load_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"runs": history, "total": len(history)}
 
 
@app.get("/eval/latest")
def get_latest_eval():
    """Return the most recent eval run, or 404 if none exist."""
    try:
        latest = load_latest()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not latest:
        raise HTTPException(status_code=404, detail="No eval runs found.")
    return latest