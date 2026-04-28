"use client";

import { useEffect, useRef } from "react";
import { MessageItem } from "@/components/chat/MessageItem";
import { ThinkingIndicator } from "@/components/chat/ThinkingIndicator";
import { ChatMessage } from "@/types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];
  isThinking: boolean;
  errorMessage?: string;
}

export function ChatWindow({ messages, isThinking, errorMessage }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages, isThinking]);

  return (
    <section className="post-chat-window" aria-live="polite">
      <div className="post-chat-window-scroll" ref={scrollRef}>
        {messages.length > 0 ? messages.map((message) => <MessageItem key={message.id} message={message} />) : null}

        {isThinking ? <ThinkingIndicator /> : null}

        {errorMessage ? <p className="post-chat-window-error">{errorMessage}</p> : null}
      </div>
    </section>
  );
}
