import React, { useState } from "react";

export default function ThreadList({
  threads,
  currentThreadId,
  onSelectThread,
  onDeleteThread,
  onNewThread,
  onUpdateTitle,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const handleNewThread = async () => {
    const title = prompt("Enter thread title (optional):");
    if (title !== null) {
      await onNewThread(title || undefined);
    }
  };

  const handleDelete = (e, threadId) => {
    e.stopPropagation();
    if (confirm("Delete this thread? This cannot be undone.")) {
      onDeleteThread(threadId);
    }
  };

  const handleEditTitle = (e, threadId, currentTitle) => {
    e.stopPropagation();
    setEditingId(threadId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (threadId) => {
    if (editingTitle.trim() && onUpdateTitle) {
      await onUpdateTitle(threadId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg)",
      }}
    >
      {/* New Thread Button */}
      <button
        onClick={handleNewThread}
        style={{
          padding: "12px 16px",
          margin: "12px 12px 8px 12px",
          border: "none",
          borderRadius: "8px",
          background: "var(--accent)",
          color: "white",
          fontSize: "13px",
          fontWeight: "500",
          cursor: "pointer",
          fontFamily: "DM Sans",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.target.style.opacity = "1")}
      >
        + New Chat
      </button>

      {/* Threads List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingLeft: "8px",
          paddingRight: "8px",
        }}
      >
        {threads.length === 0 ? (
          <p
            style={{
              padding: "16px",
              fontSize: "13px",
              color: "var(--text-3)",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            No conversations yet. Create a new chat to get started!
          </p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              onMouseEnter={() => setHoveredId(thread.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: "12px",
                margin: "4px 0",
                borderRadius: "8px",
                background:
                  currentThreadId === thread.id ? "var(--bg-2)" : "transparent",
                cursor: "pointer",
                border:
                  currentThreadId === thread.id
                    ? "1px solid var(--accent)"
                    : "1px solid transparent",
                transition: "all 0.2s",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "8px",
              }}
              onClick={() => onSelectThread(thread.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === thread.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleSaveTitle(thread.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveTitle(thread.id);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      border: "1px solid var(--accent)",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontFamily: "DM Sans",
                      background: "var(--bg)",
                      color: "var(--text)",
                    }}
                  />
                ) : (
                  <>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {thread.title}
                    </h4>
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "11px",
                        color: "var(--text-3)",
                      }}
                    >
                      {formatDate(thread.updatedAt)}
                    </p>
                  </>
                )}
              </div>

              {/* Action buttons - show on hover */}
              {hoveredId === thread.id && editingId !== thread.id && (
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  {onUpdateTitle && (
                    <button
                      onClick={(e) =>
                        handleEditTitle(e, thread.id, thread.title)
                      }
                      style={{
                        padding: "4px 6px",
                        background: "transparent",
                        border: "none",
                        color: "var(--text-3)",
                        cursor: "pointer",
                        fontSize: "12px",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = "var(--text)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = "var(--text-3)";
                      }}
                      title="Edit thread title"
                    >
                      ✏
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(e, thread.id)}
                    style={{
                      padding: "4px 6px",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-3)",
                      cursor: "pointer",
                      fontSize: "12px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = "var(--error, #ff6b6b)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = "var(--text-3)";
                    }}
                    title="Delete thread"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
