import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'

export default function App() {
  const { documents, loading, uploading, error, load, upload, remove } = useDocuments()
  const { messages, thinking, ask, clear } = useChat()

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Sidebar
        documents={documents}
        loading={loading}
        uploading={uploading}
        onUpload={upload}
        onDelete={remove}
        onLoad={load}
      />
      <ChatWindow
        messages={messages}
        thinking={thinking}
        onAsk={ask}
        onClear={clear}
        docCount={documents.length}
      />
    </div>
  )
}