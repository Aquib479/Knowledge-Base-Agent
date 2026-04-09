import { useState, useCallback } from 'react'
import { askQuestion } from '../api'

export function useChat() {
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(null)

  const ask = useCallback(async (question) => {
    if (!question.trim()) return

    const userMsg = { id: Date.now(), role: 'user', text: question }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)
    setError(null)

    try {
      const data = await askQuestion(question)
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.answer,
        sources: data.sources || [],
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      setError(e.message)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'error',
        text: e.message,
      }])
    } finally {
      setThinking(false)
    }
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, thinking, error, ask, clear }
}