# KnowledgeOS — Internal Knowledge Base Agent

Upload PDFs. Ask questions. Get answers with source attribution.

Built with: FastAPI · ChromaDB · sentence-transformers · Groq · React · Vite

---

## Setup

### 1. Get a Groq API key
Go to https://console.groq.com → create a free account → copy your API key.

### 2. Backend

```bash
cd backend

# Create virtual environment
python3.10 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your API key
cp .env.example .env
# Open .env and paste your GROQ_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at:     http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

---

## How It Works

```
PDF upload
  → pypdf extracts text
  → text cleaned + split into sentence-aware chunks (~400 words)
  → each chunk embedded with all-MiniLM-L6-v2
  → embeddings stored in ChromaDB (persisted to ./chroma_store)

User question
  → question embedded with same model
  → top 5 most similar chunks retrieved from ChromaDB
  → chunks + question sent to Groq (llama-3.1-8b-instant)
  → answer + source passages returned to frontend
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload and ingest a PDF |
| POST | `/ask` | Ask a question, get answer + sources |
| GET | `/documents` | List all ingested documents |
| DELETE | `/documents/{doc_id}` | Delete a document + its chunks |

---

## What to Build Next (v2)

- [ ] Migrating to pure typescript with UI Libraries on top of tailwindcss
- [ ] Google Drive / Notion sync (connect real team docs)
- [ ] Slack bot interface (`/ask` command)  
- [ ] RAGAS evaluation — hallucination rate, answer relevance
- [ ] Streaming responses (FastAPI StreamingResponse + React)
- [ ] User auth + multi-workspace support
- [ ] Re-ranking with a cross-encoder for better retrieval precision
