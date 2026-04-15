"""
eval.py — RAGAS evaluation engine.

How RAGAS works internally:
  1. You give it: question, answer, retrieved_contexts, ground_truth
  2. It sends these to a "judge LLM" with carefully crafted prompts
  3. The judge scores each metric independently
  4. Scores are averaged across all questions in your test set

The judge LLM we use: Groq (llama-3.3-70b-versatile) via OpenAI-compatible API.
Why not the same model we use for answers?
  Using a DIFFERENT model as judge reduces bias — the judge hasn't seen
  the system prompt or retrieval, so it evaluates more objectively.
  We use the larger 70b model as judge because evaluation needs more
  reasoning than answer generation.

Metrics we compute:
  - faithfulness:       Does the answer stay grounded in the retrieved chunks?
                        Score = (claims in answer that appear in context) / (total claims)
  - answer_relevancy:   Does the answer address the question?
                        Score = semantic similarity of question to generated reverse-questions
  - context_recall:     Did retrieval fetch the right chunks?
                        Score = (sentences in ground_truth covered by context) / (total sentences)
"""

import os
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_recall
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from retrieval import retrieve
from generation import generate_answer
from eval_store import save_run


def _get_judge_llm():
    """
    Returns a LangChain LLM pointed at Groq's OpenAI-compatible endpoint.

    Groq exposes an OpenAI-compatible API at api.groq.com/openai/v1.
    LangChain's ChatOpenAI can target any OpenAI-compatible API by
    setting base_url and api_key. This is a common pattern for using
    local models (Ollama) or alternative providers (Groq, Together, etc.)
    """
    return ChatOpenAI(
        model="llama-3.3-70b-versatile",   # larger model = better judge
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
        temperature=0,                      # deterministic scoring
    )


def _get_judge_embeddings():
    """
    RAGAS needs embeddings for the answer_relevancy metric.
    We use Groq's OpenAI-compatible endpoint here too.
    Note: Groq doesn't serve embedding models, so we use a small
    OpenAI-compatible model. If you don't have an OpenAI key, you
    can swap this for a local sentence-transformers model instead.

    Alternative (no OpenAI key needed):
        from ragas.embeddings import HuggingfaceEmbeddings
        return HuggingfaceEmbeddings(model_name="all-MiniLM-L6-v2")
    """
    # Try OpenAI embeddings first; fall back gracefully if no key
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        return OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=openai_key,
        )

    # Fallback: use the same sentence-transformer we already have
    from ragas.embeddings import HuggingfaceEmbeddings
    return HuggingfaceEmbeddings(model_name="all-MiniLM-L6-v2")


def run_evaluation(test_cases: list[dict]) -> dict:
    """
    Run RAGAS evaluation over a list of test cases.

    Each test case must have:
        question    (str) — the query to ask
        ground_truth (str) — the ideal / reference answer

    Returns a dict with:
        scores       — averaged metric scores across all questions
        per_question — per-question breakdown
        run_id       — timestamp of this run (for history tracking)

    Why do we need ground_truth?
        context_recall needs a reference answer to check if the
        retrieved chunks contain the right information. Without it,
        RAGAS can only compute faithfulness and answer_relevancy.
    """
    if not test_cases:
        raise ValueError("test_cases must not be empty")

    questions        = []
    answers          = []
    contexts_list    = []
    ground_truths    = []

    # Run the full RAG pipeline for each test case
    for tc in test_cases:
        q  = tc["question"]
        gt = tc["ground_truth"]

        # Retrieve chunks (same retriever as production)
        chunks = retrieve(q, top_k=5)
        context_texts = [c["text"] for c in chunks]

        # Generate answer (same generator as production)
        answer = generate_answer(q, chunks)

        questions.append(q)
        answers.append(answer)
        contexts_list.append(context_texts)   # RAGAS expects list of strings
        ground_truths.append(gt)

    # Build a HuggingFace Dataset — RAGAS's required input format
    dataset = Dataset.from_dict({
        "question":     questions,
        "answer":       answers,
        "contexts":     contexts_list,
        "ground_truth": ground_truths,
    })

    # Configure the judge LLM + embeddings
    judge_llm        = _get_judge_llm()
    judge_embeddings = _get_judge_embeddings()

    # Run RAGAS — this makes several LLM calls per question per metric
    # Expect ~10-30 seconds for a 5-question test set
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_recall],
        llm=judge_llm,
        embeddings=judge_embeddings,
        raise_exceptions=False,   # partial results > crash on one bad question
    )

    # Extract averaged scores (RAGAS returns them as floats or nan)
    def safe_score(val) -> float | None:
        try:
            f = float(val)
            return round(f, 4) if f == f else None  # nan check
        except (TypeError, ValueError):
            return None

    scores = {
        "faithfulness":      safe_score(result["faithfulness"]),
        "answer_relevancy":  safe_score(result["answer_relevancy"]),
        "context_recall":    safe_score(result["context_recall"]),
    }

    # Build per-question breakdown for detailed inspection
    df = result.to_pandas()
    per_question = []
    for i, row in df.iterrows():
        per_question.append({
            "question":          row.get("question", ""),
            "answer":            row.get("answer", ""),
            "ground_truth":      row.get("ground_truth", ""),
            "faithfulness":      safe_score(row.get("faithfulness")),
            "answer_relevancy":  safe_score(row.get("answer_relevancy")),
            "context_recall":    safe_score(row.get("context_recall")),
        })

    # Persist to eval_history.json
    record = save_run(scores, per_question)

    return {
        "run_id":        record["run_id"],
        "scores":        scores,
        "per_question":  per_question,
        "num_questions": len(test_cases),
    }