"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";

interface PostChatbotProps {
  postSlug: string;
  postTitle: string;
}

export function PostChatbot({ postSlug, postTitle }: PostChatbotProps) {
  return <ChatContainer postSlug={postSlug} postTitle={postTitle} />;
}
