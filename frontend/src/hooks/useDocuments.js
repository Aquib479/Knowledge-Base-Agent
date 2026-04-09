import { useState, useCallback } from 'react'
import { fetchDocuments, uploadPDF, deleteDocument } from '../api'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDocuments()
      setDocuments(data.documents || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const upload = useCallback(async (file) => {
    setUploading(true)
    setError(null)
    try {
      const result = await uploadPDF(file)
      await load()
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setUploading(false)
    }
  }, [load])

  const remove = useCallback(async (doc_id) => {
    setError(null)
    try {
      await deleteDocument(doc_id)
      setDocuments(prev => prev.filter(d => d.doc_id !== doc_id))
    } catch (e) {
      setError(e.message)
    }
  }, [])

  return { documents, loading, uploading, error, load, upload, remove }
}