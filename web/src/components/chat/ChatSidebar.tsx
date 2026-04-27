"use client";

import { ChatSessionSummary } from "@/types/chat";

interface ChatSidebarProps {
  sessions: ChatSessionSummary[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: ChatSidebarProps) {
  return (
    <aside className="post-chat-sidebar" aria-label="Chat sessions">
      <div className="post-chat-sidebar-header">
        <p className="post-chat-sidebar-title">Sessions</p>
        <button type="button" className="post-chat-sidebar-new" onClick={onCreateSession}>
          + New
        </button>
      </div>

      <div className="post-chat-sidebar-list">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`post-chat-session-item ${currentSessionId === session.id ? "is-active" : ""}`}
            >
              <button type="button" className="post-chat-session-main" onClick={() => onSelectSession(session.id)}>
                <span className="post-chat-session-title">{session.title}</span>
                <span className="post-chat-session-meta">{session.messageCount} messages</span>
              </button>
              <button
                type="button"
                className="post-chat-session-delete"
                onClick={() => {
                  void onDeleteSession(session.id);
                }}
                aria-label={`Delete session ${session.title}`}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <p className="post-chat-sidebar-empty">No sessions yet.</p>
        )}
      </div>
    </aside>
  );
}
