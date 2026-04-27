"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessage, ChatModelOption, ChatProvider, ChatSessionSummary } from "@/types/chat";

interface ChatContainerProps {
  postSlug: string;
  postTitle: string;
}

interface StreamMetadata {
  sessionId: string;
  provider: ChatProvider;
  model: string;
  sources: Array<{ slug: string; title: string }>;
}

interface ModelCatalogPayload {
  provider: ChatProvider;
  source: "live" | "fallback";
  defaultModel: string;
  models: ChatModelOption[];
  fetchedAt: string;
}

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatContainer({ postSlug, postTitle }: ChatContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [provider, setProvider] = useState<ChatProvider>("offline");
  const [model, setModel] = useState("offline");
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([{ id: "offline", label: "offline" }]);
  const [modelSource, setModelSource] = useState<"live" | "fallback">("fallback");
  const [apiKey, setApiKey] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const endpoint = useMemo(() => `/api/posts/${postSlug}/chat`, [postSlug]);

  const fetchSessions = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Unable to load sessions");
    }

    const payload = await response.json() as { sessions?: ChatSessionSummary[] };
    return Array.isArray(payload.sessions) ? payload.sessions : [];
  }, [endpoint]);

  async function loadSessions() {
    const nextSessions = await fetchSessions();
    setSessions(nextSessions);
  }

  const loadModels = useCallback(async (nextProvider: ChatProvider, nextApiKey?: string) => {
    setIsLoadingModels(true);

    try {
      const response = await fetch("/api/chat/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: nextProvider,
          apiKey: nextApiKey?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to load models");
      }

      const payload = await response.json() as ModelCatalogPayload;
      const options = Array.isArray(payload.models) && payload.models.length > 0
        ? payload.models
        : [{ id: payload.defaultModel, label: payload.defaultModel }];

      setModelOptions(options);
      setModelSource(payload.source);

      setModel((currentModel) => {
        if (options.some((option) => option.id === currentModel)) {
          return currentModel;
        }

        return options[0]?.id || payload.defaultModel;
      });
    } catch {
      setModelOptions([{ id: "offline", label: "offline" }]);
      setModel("offline");
      setModelSource("fallback");
      setErrorMessage("Unable to load model list. Falling back to defaults.");
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  async function loadSessionMessages(sessionId: string) {
    const response = await fetch(`${endpoint}?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Unable to load messages");
    }

    const payload = await response.json() as {
      messages?: ChatMessage[];
    };

    setCurrentSessionId(sessionId);
    setMessages(Array.isArray(payload.messages) ? payload.messages : []);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    void fetchSessions()
      .then((nextSessions) => {
        if (!cancelled) {
          setSessions(nextSessions);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("Unable to load chat sessions at the moment.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSessions, isOpen]);

  async function handleSend(message: string) {
    setErrorMessage("");
    setIsThinking(true);

    const userMessage = createMessage("user", message);
    const assistantMessage = createMessage("assistant", "");

    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: "Request failed" })) as { error?: string };
        throw new Error(payload.error || "Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";
      let metadata: StreamMetadata | null = null;

      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;

        if (!chunk.value) {
          continue;
        }

        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line) {
            continue;
          }

          if (line.startsWith("meta:")) {
            metadata = JSON.parse(line.slice(5)) as StreamMetadata;
            setCurrentSessionId(metadata.sessionId);
            continue;
          }

          if (line.startsWith("data:")) {
            const segment = line.slice(5);
            setMessages((current) => {
              return current.map((item) => {
                if (item.id !== assistantMessage.id) {
                  return item;
                }

                return {
                  ...item,
                  content: item.content + segment,
                  sources: metadata?.sources,
                };
              });
            });
          }
        }
      }

      await loadSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send message");
      setMessages((current) => current.filter((item) => item.id !== assistantMessage.id));
    } finally {
      setIsThinking(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    setErrorMessage("");

    const response = await fetch(`${endpoint}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setErrorMessage("Unable to delete this session.");
      return;
    }

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }

    await loadSessions();
  }

  return (
    <div className="post-chat-root">
      <button
        type="button"
        className="post-chat-toggle"
        aria-expanded={isOpen}
        aria-controls="post-chat-panel"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);

          if (nextOpen) {
            void loadModels(provider, apiKey);
          }
        }}
      >
        {isOpen ? "Close assistant" : "Ask this post"}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.section
            id="post-chat-panel"
            className="post-chat-panel"
            initial={{ opacity: 0, x: 32, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="post-chat-panel-header">
              <p className="post-chat-panel-kicker">Article Assistant</p>
              <h2 className="post-chat-panel-title">{postTitle}</h2>
            </header>

            <div className="post-chat-provider-row">
              <label className="post-chat-provider-field">
                <span>Provider</span>
                <select
                  value={provider}
                  onChange={(event) => {
                    const nextProvider = event.target.value as ChatProvider;
                    setProvider(nextProvider);
                    setErrorMessage("");
                    void loadModels(nextProvider, apiKey);
                  }}
                >
                  <option value="offline">offline</option>
                  <option value="openrouter">openrouter</option>
                  <option value="openai">openai</option>
                  <option value="gemini">gemini</option>
                </select>
              </label>

              <label className="post-chat-provider-field">
                <span>Model {isLoadingModels ? "(syncing)" : modelSource === "live" ? "(live)" : "(fallback)"}</span>
                <select value={model} onChange={(event) => setModel(event.target.value)} disabled={isLoadingModels}>
                  {modelOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="post-chat-provider-field">
                <span>API Key (optional)</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Use env key if empty"
                />
              </label>

              <button
                type="button"
                className="post-chat-model-refresh"
                onClick={() => {
                  void loadModels(provider, apiKey);
                }}
                disabled={isLoadingModels}
              >
                {isLoadingModels ? "Refreshing..." : "Refresh models"}
              </button>
            </div>

            <div className="post-chat-panel-body">
              <ChatSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onCreateSession={() => {
                  setCurrentSessionId(null);
                  setMessages([]);
                }}
                onSelectSession={(sessionId) => {
                  void loadSessionMessages(sessionId).catch(() => {
                    setErrorMessage("Unable to load selected session.");
                  });
                }}
                onDeleteSession={handleDeleteSession}
              />

              <div className="post-chat-main-column">
                <ChatWindow messages={messages} isThinking={isThinking} errorMessage={errorMessage} />
                <ChatInput onSend={handleSend} disabled={isThinking} />
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
