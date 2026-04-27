"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChatMessage } from "@/types/chat";

interface MessageItemProps {
  message: ChatMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <motion.article
      className={`post-chat-message ${isUser ? "is-user" : "is-assistant"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <p className="post-chat-message-role">{isUser ? "You" : "Assistant"}</p>
      <p className="post-chat-message-text">{message.content}</p>

      {!isUser && message.sources && message.sources.length > 0 ? (
        <div className="post-chat-message-sources">
          {message.sources.slice(0, 3).map((source) => (
            <Link key={`${message.id}-${source.slug}`} href={`/blog/${source.slug}`} className="post-chat-source-link">
              {source.title}
            </Link>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}
