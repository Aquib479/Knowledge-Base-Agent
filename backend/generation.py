import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment variables.")
        _client = Groq(api_key=api_key)
    return _client

SYSTEM_PROMPT = """You are a precise knowledge assistant. Your job is to answer questions 
using ONLY the context passages provided below. 
 
Rules:
- Base your answer strictly on the provided context.
- If the context doesn't contain enough information, say so clearly.
- Be concise but complete. Use bullet points when listing multiple items.
- Never make up information not present in the context.
- Cite which document your answer comes from naturally in your response."""
 
def build_prompt(question: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(f"[Source {i} - {chunk['filename']}]\n{chunk['text']}")
    context = "\n\n---\n\n".join(context_parts)
    return f"Context:\n{context}\n\nQuestion: {question}"

def generate_answer(question: str, chunks: list[dict]) -> str:
    """Call Groq with retrieved context and return the answer string."""
    if not chunks: 
        return "I couldn't find any relevant information in the uploaded documents to answer your question."
    
    client = get_client()
    user_message = build_prompt(question, chunks)

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        temperature=0.2,
        max_tokens=1024,
    )

    return response.choices[0].message.content.strip()


def stream_answer(question: str, chunks: list[dict], confidence: dict | None = None):
    """
    Generator that yields SSE-formatted strings token by token.
 
    SSE format the browser expects:
        data: {"type": "token", "text": "Hello"}\n\n
        data: {"type": "sources", "sources": [...]}\n\n
        data: {"type": "done"}\n\n
 
    Why send sources first then tokens?
    We retrieve chunks BEFORE calling the LLM, so we already have
    the sources. We send them immediately so the UI can show source
    cards while the answer is still streaming in.
    """
    if confidence:
        yield f"data: {json.dumps({'type': 'confidence', **confidence})}\n\n"
    if not chunks:
        yield f"data: {json.dumps({'type': 'token', 'text': 'I could not find relevant information in the uploaded documents.'})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return
 
    # Send sources immediately — before any tokens arrive
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
    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
 
    # Stream tokens from Groq
    client = get_client()
    user_message = build_prompt(question, chunks)
 
    # stream=True tells Groq to send tokens as they're generated
    stream = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=1024,
        stream=True,          # ← the only change from generate_answer
    )
 
    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:             # delta can be None on the last chunk
            yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
 
    yield f"data: {json.dumps({'type': 'done'})}\n\n"