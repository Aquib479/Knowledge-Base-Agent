import { useState, useCallback, useEffect } from "react";
import {
  createThread,
  getThreads,
  deleteThread,
  updateThreadTitle,
  getMessages,
  addMessage,
} from "../utils/indexedDB";

export function useThreads() {
  const [threads, setThreads] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      const loadedThreads = await getThreads();
      setThreads(loadedThreads);

      // If no current thread is selected and threads exist, select the first one
      if (!currentThreadId && loadedThreads.length > 0) {
        setCurrentThreadId(loadedThreads[0].id);
      } else if (loadedThreads.length === 0) {
        setCurrentThreadId(null);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentThreadId]);

  const createNewThread = useCallback(async (title) => {
    try {
      setLoading(true);
      const newThread = await createThread(title);
      setThreads((prev) => [newThread, ...prev]);
      setCurrentThreadId(newThread.id);
      setError(null);
      return newThread;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCurrentThread = useCallback(
    async (threadId) => {
      try {
        setLoading(true);
        await deleteThread(threadId);
        setThreads((prev) => prev.filter((t) => t.id !== threadId));

        // If the deleted thread was the current one, switch to another
        if (currentThreadId === threadId) {
          const remaining = threads.filter((t) => t.id !== threadId);
          setCurrentThreadId(remaining.length > 0 ? remaining[0].id : null);
        }

        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [currentThreadId, threads],
  );

  const updateTitle = useCallback(async (threadId, newTitle) => {
    try {
      const updatedThread = await updateThreadTitle(threadId, newTitle);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? updatedThread : t)),
      );
      setError(null);
      return updatedThread;
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const selectThread = useCallback((threadId) => {
    setCurrentThreadId(threadId);
  }, []);

  const saveMessage = useCallback(
    async (message) => {
      if (!currentThreadId) {
        setError("No thread selected");
        return null;
      }

      try {
        const savedMessage = await addMessage(currentThreadId, message);
        setError(null);
        return savedMessage;
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [currentThreadId],
  );

  const loadThreadMessages = useCallback(async (threadId) => {
    try {
      const messages = await getMessages(threadId);
      setError(null);
      return messages;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  return {
    threads,
    currentThreadId,
    loading,
    error,
    createNewThread,
    deleteCurrentThread,
    updateTitle,
    selectThread,
    saveMessage,
    loadThreadMessages,
    loadThreads,
  };
}
