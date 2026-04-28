"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatMessage, ChatModelOption, ChatProvider, ChatSessionSummary } from "@/types/chat";

interface ChatContainerProps {
  postSlug: string;
  postTitle: string;
}

interface StreamMetadata {
  sessionId: string;
  sources: Array<{ slug: string; title: string }>;
}

interface ModelCatalogPayload {
  provider: ChatProvider;
  source: "live" | "fallback";
  defaultModel: string;
  models: ChatModelOption[];
  fetchedAt: string;
}

interface LocalChatCache {
  sessions: ChatSessionSummary[];
  messagesBySession: Record<string, ChatMessage[]>;
}

type ChatViewMode = "compact" | "focus";

function displayProviderLabel(provider: ChatProvider) {
  if (provider === "openrouter") {
    return "OpenRouter";
  }

  if (provider === "openai") {
    return "OpenAI";
  }

  if (provider === "gemini") {
    return "Gemini";
  }

  return "Offline";
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l2.3 5.2L20 10l-5.7 2.8L12 18l-2.3-5.2L4 10l5.7-2.8z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconSessions() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconNew() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 10V4H2M16 10V4h6M8 14v6H2M16 14v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function createMessage(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatSessionTimestamp(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSessionStatus(expiresAt: string) {
  return new Date(expiresAt).getTime() > Date.now() ? "Active" : "Expired";
}

export function ChatContainer({ postSlug, postTitle }: ChatContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [showLauncherHint, setShowLauncherHint] = useState(false);
  const [viewMode, setViewMode] = useState<ChatViewMode>("compact");
  const [isSessionTrayOpen, setIsSessionTrayOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatingNewSession, setIsCreatingNewSession] = useState(false);
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
  const [showNewSessionNotice, setShowNewSessionNotice] = useState(false);
  const [isProviderSelectOpen, setIsProviderSelectOpen] = useState(false);
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
  const newSessionNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const triggerNewSessionNotice = useCallback(() => {
    setShowNewSessionNotice(true);

    if (newSessionNoticeTimeoutRef.current) {
      clearTimeout(newSessionNoticeTimeoutRef.current);
    }

    newSessionNoticeTimeoutRef.current = setTimeout(() => {
      setShowNewSessionNotice(false);
    }, 2200);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (isOpen) {
      root.setAttribute("data-chat-open", "true");
    } else {
      root.removeAttribute("data-chat-open");
    }

    return () => {
      root.removeAttribute("data-chat-open");
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (newSessionNoticeTimeoutRef.current) {
        clearTimeout(newSessionNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const hintDelayMs = 3 * 60 * 1000;
    const hintVisibleMs = 7 * 1000;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    function showHint() {
      setShowLauncherHint(true);

      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }

      hideTimeout = setTimeout(() => {
        setShowLauncherHint(false);
      }, hintVisibleMs);
    }

    const interval = setInterval(showHint, hintDelayMs);

    return () => {
      clearInterval(interval);

      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [isOpen]);

  const endpoint = useMemo(() => `/api/posts/${postSlug}/chat`, [postSlug]);
  const localCacheKey = useMemo(() => `post-chat-cache:${postSlug}`, [postSlug]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const readLocalCache = useCallback((): LocalChatCache => {
    if (typeof window === "undefined") {
      return { sessions: [], messagesBySession: {} };
    }

    try {
      const raw = window.localStorage.getItem(localCacheKey);

      if (!raw) {
        return { sessions: [], messagesBySession: {} };
      }

      const parsed = JSON.parse(raw) as Partial<LocalChatCache>;
      return {
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        messagesBySession: parsed.messagesBySession && typeof parsed.messagesBySession === "object"
          ? parsed.messagesBySession
          : {},
      };
    } catch {
      return { sessions: [], messagesBySession: {} };
    }
  }, [localCacheKey]);

  const writeLocalCache = useCallback((cache: LocalChatCache) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(localCacheKey, JSON.stringify(cache));
  }, [localCacheKey]);

  const persistSessionMessagesToLocal = useCallback((sessionId: string, nextMessages: ChatMessage[]) => {
    const cache = readLocalCache();
    const visible = nextMessages.filter((item) => item.role === "user" || item.role === "assistant");

    const preview = visible.at(-1)?.content?.trim().slice(0, 140) || undefined;
    const nowIso = new Date().toISOString();
    const existingSession = cache.sessions.find((session) => session.id === sessionId);

    const nextSession: ChatSessionSummary = existingSession
      ? {
        ...existingSession,
        updatedAt: nowIso,
        messageCount: visible.length,
        previewContent: preview,
      }
      : {
        id: sessionId,
        postSlug,
        title: visible.find((item) => item.role === "user")?.content?.trim().slice(0, 64) || "New session",
        createdAt: nowIso,
        updatedAt: nowIso,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        messageCount: visible.length,
        previewContent: preview,
      };

    const mergedSessions = [
      nextSession,
      ...cache.sessions.filter((session) => session.id !== sessionId),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    writeLocalCache({
      sessions: mergedSessions,
      messagesBySession: {
        ...cache.messagesBySession,
        [sessionId]: visible,
      },
    });
  }, [postSlug, readLocalCache, writeLocalCache]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) ?? null,
    [sessions, currentSessionId],
  );

  const fetchSessions = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Unable to load sessions");
    }

    const payload = await response.json() as { sessions?: ChatSessionSummary[] };
    return Array.isArray(payload.sessions) ? payload.sessions : [];
  }, [endpoint]);

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
      setErrorMessage("Unable to load model list. Falling back to offline model.");
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const nextSessions = await fetchSessions();

      if (nextSessions.length > 0) {
        setSessions(nextSessions);
        writeLocalCache({
          sessions: nextSessions,
          messagesBySession: readLocalCache().messagesBySession,
        });
        return;
      }
    } catch {
      // fall through to local cache
    }

    const local = readLocalCache();
    setSessions(local.sessions);
  }, [fetchSessions, readLocalCache, writeLocalCache]);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${endpoint}?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Unable to load messages");
      }

      const payload = await response.json() as {
        messages?: ChatMessage[];
      };

      const nextMessages = Array.isArray(payload.messages) ? payload.messages : [];
      setCurrentSessionId(sessionId);
      setIsCreatingNewSession(false);
      setMessages(nextMessages);
      persistSessionMessagesToLocal(sessionId, nextMessages);
      return;
    } catch {
      const local = readLocalCache();
      const nextMessages = local.messagesBySession[sessionId] ?? [];

      if (nextMessages.length === 0) {
        throw new Error("Unable to load messages");
      }

      setCurrentSessionId(sessionId);
      setIsCreatingNewSession(false);
      setMessages(nextMessages);
    }
  }, [endpoint, persistSessionMessagesToLocal, readLocalCache]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const loadWithFallback = async () => {
      try {
        const nextSessions = await fetchSessions();

        if (nextSessions.length > 0) {
          return nextSessions;
        }
      } catch {
        // fallback to local cache
      }

      return readLocalCache().sessions;
    };

    void loadWithFallback()
      .then((nextSessions) => {
        if (cancelled) {
          return;
        }

        setSessions(nextSessions);

        if (!currentSessionId && !isCreatingNewSession && nextSessions.length > 0) {
          void loadSessionMessages(nextSessions[0].id).catch(() => {
            if (!cancelled) {
              setErrorMessage("Unable to load selected session.");
            }
          });
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
  }, [fetchSessions, isOpen, currentSessionId, isCreatingNewSession, loadSessionMessages, readLocalCache]);

  async function handleSend(message: string) {
    setErrorMessage("");
    setIsThinking(true);
    setIsCreatingNewSession(false);

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
      let assistantText = "";

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
            assistantText += segment;
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

      const resolvedSessionId = metadata?.sessionId ?? currentSessionId;

      if (resolvedSessionId) {
        const localMessages = [
          ...messagesRef.current.filter((item) => item.id !== assistantMessage.id),
          {
            ...assistantMessage,
            content: assistantText || assistantMessage.content,
            sources: metadata?.sources,
          },
        ];
        persistSessionMessagesToLocal(resolvedSessionId, localMessages);
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

    const local = readLocalCache();
    const nextMessagesBySession = { ...local.messagesBySession };
    delete nextMessagesBySession[sessionId];
    writeLocalCache({
      sessions: local.sessions.filter((session) => session.id !== sessionId),
      messagesBySession: nextMessagesBySession,
    });

    await loadSessions();
  }

  return (
    <div className="post-chat-root">
      <AnimatePresence>
        {!isOpen ? (
          <motion.div className="post-chat-launcher-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <AnimatePresence>
              {showLauncherHint ? (
                <motion.p
                  className="post-chat-launcher-hint"
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  Use AI Agent Assistant for the best experience
                </motion.p>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="button"
              className="post-chat-launcher"
              aria-label="Open assistant"
              title="Open assistant"
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -4, 0], scale: [1, 1.03, 1] }}
              exit={{ opacity: 0, y: 10, scale: 0.92 }}
              transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
              onClick={() => {
                setShowLauncherHint(false);
                setIsOpen(true);
                void loadModels(provider, apiKey);
              }}
            >
              <motion.span
                className="post-chat-launcher-ring post-chat-launcher-ring-a"
                aria-hidden="true"
                animate={prefersReducedMotion ? { opacity: 0.6 } : { rotate: 360, opacity: [0.42, 0.7, 0.42] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <motion.span
                className="post-chat-launcher-ring post-chat-launcher-ring-b"
                aria-hidden="true"
                animate={prefersReducedMotion ? { opacity: 0.36 } : { rotate: -360, opacity: [0.26, 0.52, 0.26] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 7.6, repeat: Infinity, ease: "linear" }}
              />
              <motion.span
                className="post-chat-launcher-glint"
                aria-hidden="true"
                animate={prefersReducedMotion ? { opacity: 0.42 } : { opacity: [0.2, 0.62, 0.2], scale: [0.94, 1.12, 0.94] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="post-chat-launcher-icon"
                animate={prefersReducedMotion ? { rotate: 0 } : { rotate: [0, 360] }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <IconSpark />
              </motion.span>
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen ? (
          <motion.section
            id="post-chat-panel"
            className={`post-chat-panel ${viewMode === "focus" ? "is-focus" : "is-compact"} ${isSessionTrayOpen ? "is-session-mode" : ""}`}
            initial={{ opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="post-chat-orb post-chat-orb-a"
              aria-hidden="true"
              animate={{ x: [0, 16, -10, 0], y: [0, -12, 8, 0], scale: [1, 1.08, 0.94, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="post-chat-orb post-chat-orb-b"
              aria-hidden="true"
              animate={{ x: [0, -22, 10, 0], y: [0, 10, -8, 0], scale: [1, 0.92, 1.06, 1] }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
            <motion.span
              className="post-chat-edge-glow"
              aria-hidden="true"
              animate={{ opacity: [0.26, 0.42, 0.26] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <header className="post-chat-panel-header">
              <div className="post-chat-panel-heading">
                <p className="post-chat-panel-kicker">Article Assistant</p>
                <h2 className="post-chat-panel-title">{postTitle}</h2>
                <p className="post-chat-panel-meta">
                  {activeSession
                    ? `${activeSession.messageCount} messages · ${displayProviderLabel(provider)}`
                    : `Ready · ${displayProviderLabel(provider)}`}
                </p>
              </div>

              <div className="post-chat-panel-actions">
                <button
                  type="button"
                  className={`post-chat-action-icon ${isSettingsOpen ? "is-active" : ""}`}
                  onClick={() => setIsSettingsOpen((current) => !current)}
                  aria-label="Toggle chat settings"
                  title="Chat settings"
                >
                  <motion.svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    animate={{ rotate: isSettingsOpen ? 90 : 0 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <path d="M19.14 12.94a7.62 7.62 0 0 0 .05-.94a7.62 7.62 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.02 7.02 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 13.9 2h-3.8a.49.49 0 0 0-.49.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.62-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.49.42h3.8c.24 0 .45-.18.49-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.25A3.25 3.25 0 1 1 12 8.75a3.25 3.25 0 0 1 0 6.5z" />
                  </motion.svg>
                </button>
                <button
                  type="button"
                  className="post-chat-action-button"
                  onClick={() => setIsSessionTrayOpen((current) => !current)}
                  aria-label={isSessionTrayOpen ? "Hide sessions" : "Show sessions"}
                  title={isSessionTrayOpen ? "Hide sessions" : "Show sessions"}
                >
                  <IconSessions />
                </button>
                <button
                  type="button"
                  className="post-chat-action-button"
                  onClick={() => {
                    setCurrentSessionId(null);
                    setMessages([]);
                    setIsCreatingNewSession(true);
                    setIsSessionTrayOpen(false);
                    triggerNewSessionNotice();
                  }}
                  aria-label="New session"
                  title="New session"
                >
                  <IconNew />
                </button>
                <button
                  type="button"
                  className="post-chat-action-button"
                  onClick={() => setViewMode((current) => current === "compact" ? "focus" : "compact")}
                  aria-label={viewMode === "compact" ? "Open full size" : "Use compact size"}
                  title={viewMode === "compact" ? "Open full size" : "Use compact size"}
                >
                  {viewMode === "compact" ? <IconExpand /> : <IconCollapse />}
                </button>
                <button
                  type="button"
                  className="post-chat-action-button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsCreatingNewSession(false);
                    setIsSessionTrayOpen(false);
                    setIsSettingsOpen(false);
                  }}
                  aria-label="Close assistant"
                  title="Close assistant"
                >
                  <IconClose />
                </button>
              </div>
            </header>

            <AnimatePresence>
              {showNewSessionNotice ? (
                <motion.div
                  className={`post-chat-toast ${viewMode === "focus" ? "is-focus" : "is-compact"}`}
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="post-chat-toast-tick" aria-hidden="true">✓</span>
                  New session is ready
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isSettingsOpen ? (
                <motion.section
                  className="post-chat-settings-tray"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.9, 0.25, 1] }}
                >
                  <div className="post-chat-settings-grid">
                    <label className="post-chat-settings-field">
                      <span>Provider</span>
                      <div className="post-chat-select-wrap">
                        <select
                          value={provider}
                          onChange={(event) => {
                            const nextProvider = event.target.value as ChatProvider;
                            setProvider(nextProvider);
                            setIsProviderSelectOpen(false);
                            setErrorMessage("");
                            void loadModels(nextProvider, apiKey);
                          }}
                          onPointerDown={() => setIsProviderSelectOpen((current) => !current)}
                          onBlur={() => setIsProviderSelectOpen(false)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                              setIsProviderSelectOpen(true);
                            }

                            if (event.key === "Escape") {
                              setIsProviderSelectOpen(false);
                            }
                          }}
                        >
                          <option value="offline">offline</option>
                          <option value="openrouter">openrouter</option>
                          <option value="openai">openai</option>
                          <option value="gemini">gemini</option>
                        </select>
                        <span className={`post-chat-select-arrow ${isProviderSelectOpen ? "is-open" : ""}`} aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M6 9l6 6l6-6" />
                          </svg>
                        </span>
                      </div>
                    </label>

                    <label className="post-chat-settings-field">
                      <span>Model {isLoadingModels ? "(syncing)" : modelSource === "live" ? "(live)" : "(cached)"}</span>
                      <div className="post-chat-select-wrap">
                        <select
                          value={model}
                          onChange={(event) => {
                            setModel(event.target.value);
                            setIsModelSelectOpen(false);
                          }}
                          disabled={isLoadingModels}
                          onPointerDown={() => setIsModelSelectOpen((current) => !current)}
                          onBlur={() => setIsModelSelectOpen(false)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                              setIsModelSelectOpen(true);
                            }

                            if (event.key === "Escape") {
                              setIsModelSelectOpen(false);
                            }
                          }}
                        >
                          {modelOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <span className={`post-chat-select-arrow ${isModelSelectOpen ? "is-open" : ""}`} aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <path d="M6 9l6 6l6-6" />
                          </svg>
                        </span>
                      </div>
                    </label>

                    <label className="post-chat-settings-field">
                      <span>API Key</span>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(event) => setApiKey(event.target.value)}
                        placeholder="Use server key if empty"
                      />
                    </label>
                  </div>

                  <div className="post-chat-settings-actions">
                    <button
                      type="button"
                      className="post-chat-settings-refresh"
                      onClick={() => {
                        void loadModels(provider, apiKey);
                      }}
                      disabled={isLoadingModels}
                    >
                      {isLoadingModels ? "Refreshing..." : "Refresh models"}
                    </button>
                  </div>
                </motion.section>
              ) : null}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isSessionTrayOpen ? (
                <motion.div
                  className="post-chat-session-tray"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.9, 0.25, 1] }}
                >
                  {sessions.length > 0 ? (
                    <div className="post-chat-session-table-wrap">
                      <table className="post-chat-session-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Contents</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((session) => {
                            const isActive = session.id === currentSessionId;
                            const preview = session.previewContent || session.title || "No content yet";
                            const status = getSessionStatus(session.expiresAt);

                            return (
                              <tr key={session.id} className={isActive ? "is-active" : ""}>
                                <td>{formatSessionTimestamp(session.updatedAt)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="post-chat-session-open"
                                    onClick={() => {
                                      setIsSessionTrayOpen(false);
                                      void loadSessionMessages(session.id).catch(() => {
                                        setErrorMessage("Unable to load selected session.");
                                      });
                                    }}
                                  >
                                    {preview}
                                  </button>
                                  <span className="post-chat-session-meta">{session.messageCount} messages</span>
                                </td>
                                <td>
                                  <span className={`post-chat-session-status ${status === "Active" ? "is-active" : "is-expired"}`}>
                                    {status}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="post-chat-session-delete"
                                    onClick={() => {
                                      void handleDeleteSession(session.id);
                                    }}
                                    aria-label={`Delete session ${session.title}`}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="post-chat-sidebar-empty">No sessions yet. Send a message to start one.</p>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>

            {!isSessionTrayOpen ? (
              <div className="post-chat-main-column">
                <ChatWindow messages={messages} isThinking={isThinking} errorMessage={errorMessage} />
                <ChatInput
                  onSend={handleSend}
                  disabled={isThinking}
                  showLabel={false}
                  label="Message the assistant"
                  placeholder="Type a question, summarize a section, or ask for related reading"
                />
              </div>
            ) : null}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
