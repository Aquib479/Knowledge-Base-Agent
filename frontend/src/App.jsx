import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { useDocuments } from "./hooks/useDocuments";
import { useChat } from "./hooks/useChat";
import { useThreads } from "./hooks/useThreads";

export default function App() {
  const { documents, loading, uploading, error, load, upload, remove } =
    useDocuments();
  const {
    threads,
    currentThreadId,
    createNewThread,
    deleteCurrentThread,
    selectThread,
    updateTitle,
  } = useThreads();
  const { messages, thinking, streaming, ask, clear } =
    useChat(currentThreadId);

  // Find the current thread's title
  const currentThread = threads.find((t) => t.id === currentThreadId);
  const threadTitle = currentThread?.title || "";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <Sidebar
        documents={documents}
        loading={loading}
        uploading={uploading}
        onUpload={upload}
        onDelete={remove}
        onLoad={load}
        threads={threads}
        currentThreadId={currentThreadId}
        onSelectThread={selectThread}
        onDeleteThread={deleteCurrentThread}
        onNewThread={createNewThread}
        onUpdateThreadTitle={updateTitle}
      />
      <ChatWindow
        messages={messages}
        thinking={thinking}
        streaming={streaming}
        onAsk={ask}
        onClear={clear}
        docCount={documents.length}
        threadTitle={threadTitle}
        currentThreadId={currentThreadId}
      />
    </div>
  );
}
