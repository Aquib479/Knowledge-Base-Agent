import { useEffect, useRef, useState } from 'react'

export default function Sidebar({ documents, loading, uploading, onUpload, onDelete, onLoad }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { onLoad() }, [])

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFiles = async (files) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) { showToast('Only PDF files are supported', 'err'); return }

    for (const file of pdfs) {
      try {
        const r = await onUpload(file)
        showToast(`✓ ${r.filename} — ${r.chunks_stored} chunks indexed`)
      } catch (e) {
        showToast(e.message, 'err')
      }
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <aside style={{
      width: 280, minWidth: 280,
      background: 'var(--bg-2)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--accent)', letterSpacing: 2 }}>
            KNOWLEDGE OS
          </span>
        </div>
        <p style={{ fontFamily: 'Instrument Serif', fontSize: 20, color: 'var(--text)', fontStyle: 'italic' }}>
          Your Docs
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          margin: '16px 16px 12px',
          border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border-2)'}`,
          borderRadius: 8,
          padding: '18px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-glow)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{
              width: 14, height: 14,
              border: '2px solid var(--border-2)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin-slow 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'DM Mono' }}>
              indexing...
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 20, marginBottom: 6 }}>⊕</div>
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'DM Mono', lineHeight: 1.5 }}>
              drop PDFs here<br />
              <span style={{ color: 'var(--text-3)' }}>or click to browse</span>
            </p>
          </>
        )}
      </div>

      {/* Doc list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {loading && (
          <div style={{ padding: '12px 8px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 44, borderRadius: 6, marginBottom: 8,
              }} className="shimmer" />
            ))}
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono', lineHeight: 1.8 }}>
              no documents yet<br />
              upload a PDF to begin
            </p>
          </div>
        )}

        {documents.map((doc, i) => (
          <DocRow key={doc.doc_id} doc={doc} index={i} onDelete={onDelete} />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', bottom: 20, left: 16, right: 16,
          background: toast.type === 'err' ? '#1a0e0e' : '#0e1a0e',
          border: `1px solid ${toast.type === 'err' ? 'var(--red)' : 'var(--accent)'}`,
          borderRadius: 8, padding: '10px 14px',
          fontSize: 11, fontFamily: 'DM Mono',
          color: toast.type === 'err' ? 'var(--red)' : 'var(--accent)',
          zIndex: 10, lineHeight: 1.4,
        }}>
          {toast.msg}
        </div>
      )}
    </aside>
  )
}

function DocRow({ doc, index, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const ext = doc.filename.split('.').pop().toUpperCase()
  const name = doc.filename.replace(/\.pdf$/i, '')

  return (
    <div
      className={`fade-up fade-up-delay-${Math.min(index + 1, 3)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 10px',
        borderRadius: 6,
        marginBottom: 4,
        background: hovered ? 'var(--bg-3)' : 'transparent',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 8, fontFamily: 'DM Mono',
          background: 'var(--border)',
          color: 'var(--text-2)',
          padding: '2px 4px', borderRadius: 3,
          flexShrink: 0,
        }}>{ext}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 12, color: 'var(--text)', fontFamily: 'Geist',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</p>
          <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono', marginTop: 1 }}>
            {doc.chunk_count} chunks
          </p>
        </div>
      </div>

      {hovered && (
        confirming ? (
          <button
            onClick={() => onDelete(doc.doc_id)}
            style={{
              fontSize: 10, fontFamily: 'DM Mono',
              color: 'var(--red)', background: 'transparent',
              border: '1px solid var(--red)',
              borderRadius: 4, padding: '3px 7px',
              cursor: 'pointer', flexShrink: 0,
            }}
          >confirm</button>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            style={{
              fontSize: 16, background: 'transparent', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer',
              lineHeight: 1, flexShrink: 0, padding: '0 4px',
            }}
          >×</button>
        )
      )}
    </div>
  )
}