"use client";

import { motion } from "framer-motion";

export function ThinkingIndicator() {
  return (
    <div className="post-chat-thinking" aria-live="polite" aria-label="Assistant is thinking">
      <span>Thinking</span>
      <div className="post-chat-thinking-dots" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <motion.i
            key={index}
            className="post-chat-thinking-dot"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
            transition={{
              duration: 0.95,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.12,
            }}
          />
        ))}
      </div>
    </div>
  );
}
