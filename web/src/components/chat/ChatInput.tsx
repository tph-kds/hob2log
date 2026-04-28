"use client";

import { useState } from "react";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void>;
  placeholder?: string;
  showLabel?: boolean;
  label?: string;
}

export function ChatInput({
  disabled,
  onSend,
  placeholder = "Ask for a summary, clarification, or related ideas",
  showLabel = true,
  label = "Ask about this post",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  async function submit() {
    const compact = value.trim();

    if (!compact || disabled) {
      return;
    }

    setValue("");
    await onSend(compact);
  }

  return (
    <form
      className="post-chat-input-shell"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {showLabel ? <label className="post-chat-input-label" htmlFor="post-chat-input">{label}</label> : null}

      <div className="post-chat-input-wrap">
        <textarea
          id="post-chat-input"
          className="post-chat-input"
          placeholder={placeholder}
          aria-label={label}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          rows={3}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
        />

        <button
          type="submit"
          aria-label="Send message"
          title="Send"
          disabled={disabled || value.trim().length === 0}
          className="post-chat-send-button"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="post-chat-send-icon">
            <path d="M4 12h12" />
            <path d="M12 6l7 6-7 6" />
          </svg>
        </button>
      </div>
    </form>
  );
}
