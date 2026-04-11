const BASE = "/api";

export async function uploadPDF(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function askQuestion(question, top_k = 5) {
  const res = await fetch(`${BASE}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Query failed");
  }
  return res.json();
}

/**
 * Streaming version of askQuestion.
 *
 * How it works:
 * - Opens a fetch to /ask/stream (which returns text/event-stream)
 * - Reads the response body as a ReadableStream
 * - Each SSE chunk looks like: "data: {...json...}\n\n"
 * - We parse each JSON payload and call the right callback
 *
 * @param {string} question
 * @param {function} onToken   - called with each text token string
 * @param {function} onSources - called once with the sources array
 * @param {AbortSignal} signal - pass an AbortController signal to cancel mid-stream
 */
export async function askStream(
  question,
  { onToken, onSources, signal, top_k = 5 } = {},
) {
  const res = await fetch(`${BASE}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Stream failed");
  }

  // res.body is a ReadableStream of Uint8Array chunks
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode the binary chunk and add to our running buffer
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by \n\n — split and process each complete event
    const parts = buffer.split("\n\n");

    // The last part may be incomplete — keep it in the buffer
    buffer = parts.pop();

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      try {
        const payload = JSON.parse(line.slice(6)); // strip "data: "

        if (payload.type === "token" && onToken) {
          onToken(payload.text);
        } else if (payload.type === "sources" && onSources) {
          onSources(payload.sources);
        }
        // type === 'done' — nothing to do, the while loop ends naturally
      } catch {
        // malformed JSON chunk — skip silently
      }
    }
  }
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error("Failed to load documents");
  return res.json();
}

export async function deleteDocument(doc_id) {
  const res = await fetch(`${BASE}/documents/${doc_id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Delete failed");
  }
  return res.json();
}
