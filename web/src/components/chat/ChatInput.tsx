"use client";

import { useState } from "react";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void>;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
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
      <label className="post-chat-input-label" htmlFor="post-chat-input">
        Ask about this post
      </label>
      <textarea
        id="post-chat-input"
        className="post-chat-input"
        placeholder="Ask for a summary, clarification, or related ideas"
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
      <button type="submit" disabled={disabled || value.trim().length === 0} className="post-chat-send-button">
        Send
      </button>
    </form>
  );
}
