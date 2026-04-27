import { ChatContextSource, ChatPromptMessage } from "@/types/chat";
import { Post } from "@/types/content";

interface PromptInput {
  post: Post;
  question: string;
  sources: ChatContextSource[];
  history: ChatPromptMessage[];
}

function renderSources(sources: ChatContextSource[]) {
  if (sources.length === 0) {
    return "No retrieved sources.";
  }

  return sources
    .map((source, index) => {
      const compactChunk = source.chunk.trim().replace(/\s+/g, " ");
      return `[${index + 1}] ${source.title} (${source.slug})\n${compactChunk}`;
    })
    .join("\n\n");
}

function trimHistory(history: ChatPromptMessage[]) {
  return history
    .filter((item) => item.role === "user" || item.role === "assistant")
    .slice(-12);
}

export function buildChatPrompt(input: PromptInput) {
  const system = [
    "You are a context-aware assistant for a technical blog.",
    "Prioritize the current post first, then related posts when needed.",
    "Stay concise, factual, and practical.",
    "If the answer is not supported by context, say so clearly.",
    "When useful, reference sources using bracket indexes like [1], [2].",
  ].join(" ");

  const contextEnvelope = [
    `Current Post: ${input.post.title} (${input.post.slug})`,
    `Summary: ${input.post.summary}`,
    "",
    "Retrieved Context:",
    renderSources(input.sources),
  ].join("\n");

  const promptMessages: ChatPromptMessage[] = [
    { role: "system", content: system },
    { role: "system", content: contextEnvelope },
    ...trimHistory(input.history),
    { role: "user", content: input.question },
  ];

  return {
    messages: promptMessages,
    sourceList: input.sources.map((source) => ({
      slug: source.slug,
      title: source.title,
    })),
  };
}
