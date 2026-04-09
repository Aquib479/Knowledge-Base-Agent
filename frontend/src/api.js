const BASE = '/api'

export async function uploadPDF(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function askQuestion(question, top_k = 5) {
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Query failed')
  }
  return res.json()
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) throw new Error('Failed to load documents')
  return res.json()
}

export async function deleteDocument(doc_id) {
  const res = await fetch(`${BASE}/documents/${doc_id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Delete failed')
  }
  return res.json()
}