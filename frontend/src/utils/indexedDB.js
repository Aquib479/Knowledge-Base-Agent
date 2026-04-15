// IndexedDB utility for storing chat threads and conversations offline
const DB_NAME = "ChatThreadDB";
const DB_VERSION = 1;
const THREADS_STORE = "threads";
const MESSAGES_STORE = "messages";

let dbInstance = null;

// Initialize the database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create threads store
      if (!db.objectStoreNames.contains(THREADS_STORE)) {
        const threadStore = db.createObjectStore(THREADS_STORE, {
          keyPath: "id",
        });
        threadStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Create messages store
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const messageStore = db.createObjectStore(MESSAGES_STORE, {
          keyPath: "id",
        });
        messageStore.createIndex("threadId", "threadId", { unique: false });
        messageStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
};

// Create a new thread
export const createThread = async (title) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const thread = {
      id: threadId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const transaction = db.transaction([THREADS_STORE], "readwrite");
    const store = transaction.objectStore(THREADS_STORE);
    const request = store.add(thread);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(thread);
  });
};

// Get all threads
export const getThreads = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([THREADS_STORE], "readonly");
    const store = transaction.objectStore(THREADS_STORE);
    const index = store.index("createdAt");
    const request = index.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by most recent first
      resolve(request.result.reverse());
    };
  });
};

// Get a specific thread
export const getThread = async (threadId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([THREADS_STORE], "readonly");
    const store = transaction.objectStore(THREADS_STORE);
    const request = store.get(threadId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Update thread title
export const updateThreadTitle = async (threadId, newTitle) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([THREADS_STORE], "readwrite");
    const store = transaction.objectStore(THREADS_STORE);
    const getRequest = store.get(threadId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const thread = getRequest.result;
      if (thread) {
        thread.title = newTitle;
        thread.updatedAt = Date.now();
        const updateRequest = store.put(thread);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve(thread);
      } else {
        reject(new Error("Thread not found"));
      }
    };
  });
};

// Delete a thread and all its messages
export const deleteThread = async (threadId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [THREADS_STORE, MESSAGES_STORE],
      "readwrite",
    );

    // Delete thread
    const threadStore = transaction.objectStore(THREADS_STORE);
    const threadRequest = threadStore.delete(threadId);

    threadRequest.onerror = () => reject(threadRequest.error);

    // Delete all messages in this thread
    const messageStore = transaction.objectStore(MESSAGES_STORE);
    const index = messageStore.index("threadId");
    const range = IDBKeyRange.only(threadId);
    const messageRequest = index.openCursor(range);

    messageRequest.onerror = () => reject(messageRequest.error);
    messageRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Add a message to a thread
export const addMessage = async (threadId, message) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      threadId,
      ...message,
      createdAt: Date.now(),
    };

    const transaction = db.transaction(
      [MESSAGES_STORE, THREADS_STORE],
      "readwrite",
    );
    const messageStore = transaction.objectStore(MESSAGES_STORE);
    const threadStore = transaction.objectStore(THREADS_STORE);

    // Add message
    const messageRequest = messageStore.add(msg);

    messageRequest.onerror = () => reject(messageRequest.error);
    messageRequest.onsuccess = () => {
      // Update thread's updatedAt timestamp
      const threadGetRequest = threadStore.get(threadId);
      threadGetRequest.onsuccess = () => {
        const thread = threadGetRequest.result;
        if (thread) {
          thread.updatedAt = Date.now();
          threadStore.put(thread);
        }
      };
      resolve(msg);
    };
  });
};

// Get messages for a thread
export const getMessages = async (threadId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([MESSAGES_STORE], "readonly");
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index("threadId");
    const range = IDBKeyRange.only(threadId);
    const request = index.getAll(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by creation time
      resolve(request.result.sort((a, b) => a.createdAt - b.createdAt));
    };
  });
};

// Clear all data (for testing purposes)
export const clearDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [THREADS_STORE, MESSAGES_STORE],
      "readwrite",
    );
    const threadRequest = transaction.objectStore(THREADS_STORE).clear();
    const messageRequest = transaction.objectStore(MESSAGES_STORE).clear();

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
};
