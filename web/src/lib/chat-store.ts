import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChatMessage, ChatMessageSource, ChatRole, ChatSessionSummary } from "@/types/chat";

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 24;
const MAX_MESSAGES = 320;
const MEMORY_COMPACTION_TRIGGER = 24;
const MEMORY_COMPACTION_KEEP_MESSAGES = 14;
const MEMORY_MAX_CHARS = 5200;
const SUMMARY_PREFIX = "MEMORY_SUMMARY::";

interface ChatSessionRow {
  id: string;
  post_slug: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

interface ChatMessageRow {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  sources: ChatMessageSource[] | null;
  created_at: string;
}

interface RuntimeSession {
  id: string;
  postSlug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  memorySummary: string;
}

const runtimeSessions = new Map<string, RuntimeSession[]>();
const runtimeMessages = new Map<string, ChatMessage[]>();

function isoNow() {
  return new Date().toISOString();
}

function computeExpiry(now: number = Date.now()) {
  return new Date(now + SESSION_TTL_MS).toISOString();
}

function mapSessionRow(
  session: ChatSessionRow,
  messageCount: number,
  memorySummary?: string,
  previewContent?: string,
): ChatSessionSummary {
  return {
    id: session.id,
    postSlug: session.post_slug,
    title: session.title ?? "New session",
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    expiresAt: session.expires_at,
    messageCount,
    memorySummary,
    previewContent,
  };
}

function trimSessionTitle(content: string) {
  const compact = content.trim().replace(/\s+/g, " ");

  if (!compact) {
    return "New session";
  }

  return compact.length > 64 ? `${compact.slice(0, 61)}...` : compact;
}

function mapMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    sources: row.sources ?? undefined,
  };
}

function isSummaryMessage(message: ChatMessage | ChatMessageRow) {
  return message.role === "system" && message.content.startsWith(SUMMARY_PREFIX);
}

function encodeSummary(summary: string) {
  return `${SUMMARY_PREFIX}${summary.trim()}`;
}

function decodeSummary(content: string) {
  if (!content.startsWith(SUMMARY_PREFIX)) {
    return "";
  }

  return content.slice(SUMMARY_PREFIX.length).trim();
}

function compactContent(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function buildPreviewContent(value: string) {
  return compactContent(value, 140);
}

function toHistoryLines(messages: ChatMessage[]) {
  const lines: string[] = [];

  for (const message of messages) {
    const prefix = message.role === "user" ? "User" : "Assistant";
    const text = compactContent(message.content, 260);

    if (!text) {
      continue;
    }

    lines.push(`- ${prefix}: ${text}`);
  }

  return lines;
}

function trimSummaryLength(summary: string) {
  const compact = summary.trim();

  if (compact.length <= MEMORY_MAX_CHARS) {
    return compact;
  }

  const overflow = compact.length - MEMORY_MAX_CHARS;
  const trimmed = compact.slice(Math.min(Math.max(overflow + 60, 0), compact.length));
  return `...${trimmed}`;
}

function compactDialogMemory(currentSummary: string, messages: ChatMessage[]) {
  const summaryMessages = messages.filter((message) => isSummaryMessage(message));
  const dialogMessages = messages.filter((message) => message.role === "user" || message.role === "assistant");

  if (dialogMessages.length <= MEMORY_COMPACTION_TRIGGER) {
    return {
      nextSummary: currentSummary,
      compactedIds: [] as string[],
      hasSummaryMessage: summaryMessages.length > 0,
    };
  }

  let compactUntil = dialogMessages.length - MEMORY_COMPACTION_KEEP_MESSAGES;

  if (compactUntil <= 0) {
    return {
      nextSummary: currentSummary,
      compactedIds: [] as string[],
      hasSummaryMessage: summaryMessages.length > 0,
    };
  }

  const candidate = dialogMessages.slice(0, compactUntil);

  if (candidate.at(-1)?.role === "user") {
    compactUntil = Math.max(compactUntil - 1, 0);
  }

  const toCompact = dialogMessages.slice(0, compactUntil);

  if (toCompact.length === 0) {
    return {
      nextSummary: currentSummary,
      compactedIds: [] as string[],
      hasSummaryMessage: summaryMessages.length > 0,
    };
  }

  const lines = toHistoryLines(toCompact);

  if (lines.length === 0) {
    return {
      nextSummary: currentSummary,
      compactedIds: [] as string[],
      hasSummaryMessage: summaryMessages.length > 0,
    };
  }

  const stitchedSummary = trimSummaryLength([
    currentSummary.trim(),
    "Recent compressed history:",
    ...lines,
  ].filter(Boolean).join("\n"));

  return {
    nextSummary: stitchedSummary,
    compactedIds: toCompact.map((message) => message.id),
    hasSummaryMessage: summaryMessages.length > 0,
  };
}

function cleanupRuntimeSessions(postSlug: string) {
  const sessions = runtimeSessions.get(postSlug);

  if (!sessions) {
    return;
  }

  const now = Date.now();
  const active = sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  const activeIds = new Set(active.map((session) => session.id));

  for (const session of sessions) {
    if (!activeIds.has(session.id)) {
      runtimeMessages.delete(session.id);
    }
  }

  runtimeSessions.set(postSlug, active);
}

function getRuntimeMessages(sessionId: string) {
  return runtimeMessages.get(sessionId) ?? [];
}

async function cleanupExpiredSupabaseSessions() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return;
  }

  await supabase.from("chat_sessions").delete().lte("expires_at", isoNow());
}

function listRuntimeSessions(postSlug: string): ChatSessionSummary[] {
  cleanupRuntimeSessions(postSlug);
  const sessions = runtimeSessions.get(postSlug) ?? [];

  return sessions
    .map((session) => {
      const dialogMessages = getRuntimeMessages(session.id).filter((message) => message.role !== "system");
      const lastMessage = dialogMessages.at(-1);

      return {
        id: session.id,
        postSlug: session.postSlug,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        messageCount: dialogMessages.length,
        memorySummary: session.memorySummary,
        previewContent: lastMessage ? buildPreviewContent(lastMessage.content) : undefined,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function getRuntimeSessionPayload(postSlug: string, sessionId: string) {
  cleanupRuntimeSessions(postSlug);
  const session = (runtimeSessions.get(postSlug) ?? []).find((item) => item.id === sessionId);

  if (!session) {
    return null;
  }

  const messages = getRuntimeMessages(sessionId);
  const visibleMessages = messages.filter((item) => !isSummaryMessage(item));

  return {
    session: {
      id: session.id,
      postSlug: session.postSlug,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      messageCount: visibleMessages.length,
      memorySummary: session.memorySummary,
    },
    messages: visibleMessages,
  };
}

function createOrReuseRuntimeSession(postSlug: string, sessionId?: string) {
  cleanupRuntimeSessions(postSlug);
  const sessions = runtimeSessions.get(postSlug) ?? [];
  const nowIso = isoNow();

  if (sessionId) {
    const existing = sessions.find((session) => session.id === sessionId);

    if (existing) {
      existing.expiresAt = computeExpiry();
      existing.updatedAt = nowIso;
      runtimeSessions.set(postSlug, sessions);
      return existing.id;
    }
  }

  const next: RuntimeSession = {
    id: randomUUID(),
    postSlug,
    title: "New session",
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: computeExpiry(),
    memorySummary: "",
  };

  const merged = [next, ...sessions].slice(0, MAX_SESSIONS);
  runtimeSessions.set(postSlug, merged);
  return next.id;
}

function appendRuntimeChatMessage(input: {
  postSlug: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources?: ChatMessageSource[];
}) {
  cleanupRuntimeSessions(input.postSlug);
  const sessions = runtimeSessions.get(input.postSlug) ?? [];
  const session = sessions.find((item) => item.id === input.sessionId);
  const nowIso = isoNow();

  if (session) {
    if (session.title === "New session" && input.role === "user") {
      session.title = trimSessionTitle(input.content);
    }

    session.updatedAt = nowIso;
    session.expiresAt = computeExpiry();
    runtimeSessions.set(input.postSlug, sessions);
  }

  const current = runtimeMessages.get(input.sessionId) ?? [];
  const nextMessage: ChatMessage = {
    id: randomUUID(),
    role: input.role,
    content: input.content,
    createdAt: nowIso,
    sources: input.sources,
  };

  runtimeMessages.set(input.sessionId, [...current, nextMessage].slice(-MAX_MESSAGES));
  return nextMessage;
}

function deleteRuntimeChatSession(postSlug: string, sessionId: string) {
  cleanupRuntimeSessions(postSlug);
  const sessions = runtimeSessions.get(postSlug) ?? [];
  const nextSessions = sessions.filter((session) => session.id !== sessionId);
  runtimeSessions.set(postSlug, nextSessions);
  runtimeMessages.delete(sessionId);
  return sessions.length !== nextSessions.length;
}

async function ensureChatPostReference(postSlug: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const { error } = await supabase
    .from("posts")
    .insert({
      slug: postSlug,
      title: postSlug,
      summary: "Auto-created placeholder to keep chat sessions persistent.",
      content: "This record is generated to satisfy chat session persistence requirements.",
      tags: [],
      published: false,
    });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return true;
  }

  return false;
}

export async function listChatSessions(postSlug: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return listRuntimeSessions(postSlug);
  }

  await cleanupExpiredSupabaseSessions();

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id,post_slug,title,created_at,updated_at,expires_at")
    .eq("post_slug", postSlug)
    .gt("expires_at", isoNow())
    .order("updated_at", { ascending: false })
    .limit(MAX_SESSIONS);

  if (sessionsError) {
    return listRuntimeSessions(postSlug);
  }

  if (!Array.isArray(sessionsData) || sessionsData.length === 0) {
    const runtimeFallback = listRuntimeSessions(postSlug);
    return runtimeFallback.length > 0 ? runtimeFallback : [];
  }

  const ids = sessionsData.map((session) => session.id);
  const { data: countsData, error: countsError } = await supabase
    .from("chat_messages")
    .select("session_id,id,role,content")
    .in("session_id", ids)
    .order("created_at", { ascending: true });

  const countBySession = new Map<string, number>();
  const previewBySession = new Map<string, string>();

  if (!countsError && Array.isArray(countsData)) {
    for (const item of countsData as Array<{ session_id: string; role: ChatRole; content: string }>) {
      const isDialog = item.role !== "system" || !item.content.startsWith(SUMMARY_PREFIX);

      if (!isDialog) {
        continue;
      }

      countBySession.set(item.session_id, (countBySession.get(item.session_id) ?? 0) + 1);

      const preview = buildPreviewContent(item.content);

      if (preview) {
        previewBySession.set(item.session_id, preview);
      }
    }
  }

  return (sessionsData as ChatSessionRow[]).map((session) => mapSessionRow(
    session,
    countBySession.get(session.id) ?? 0,
    undefined,
    previewBySession.get(session.id),
  ));
}

export async function getChatSessionMessages(postSlug: string, sessionId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return getRuntimeSessionPayload(postSlug, sessionId);
  }

  await cleanupExpiredSupabaseSessions();

  const { data: sessionData, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id,post_slug,title,created_at,updated_at,expires_at")
    .eq("id", sessionId)
    .eq("post_slug", postSlug)
    .gt("expires_at", isoNow())
    .single();

  if (sessionError) {
    return getRuntimeSessionPayload(postSlug, sessionId);
  }

  if (!sessionData) {
    return getRuntimeSessionPayload(postSlug, sessionId);
  }

  const { data: messageData, error: messageError } = await supabase
    .from("chat_messages")
    .select("id,session_id,role,content,sources,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES);

  const allMessages = !messageError && Array.isArray(messageData)
    ? (messageData as ChatMessageRow[]).map((item) => mapMessageRow(item))
    : [];
  const memorySummary = allMessages.find((item) => isSummaryMessage(item))
    ? decodeSummary(allMessages.find((item) => isSummaryMessage(item))?.content ?? "")
    : "";
  const visibleMessages = allMessages.filter((item) => !isSummaryMessage(item));

  return {
    session: mapSessionRow(sessionData as ChatSessionRow, visibleMessages.length, memorySummary),
    messages: visibleMessages,
  };
}

export async function createOrReuseSession(postSlug: string, sessionId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return createOrReuseRuntimeSession(postSlug, sessionId);
  }

  await cleanupExpiredSupabaseSessions();

  if (sessionId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("post_slug", postSlug)
      .gt("expires_at", isoNow())
      .single();

    if (error) {
      return createOrReuseRuntimeSession(postSlug, sessionId);
    }

    if (data?.id) {
      const { error: updateError } = await supabase
        .from("chat_sessions")
        .update({ updated_at: isoNow(), expires_at: computeExpiry() })
        .eq("id", sessionId);

      if (updateError) {
        return createOrReuseRuntimeSession(postSlug, sessionId);
      }

      return sessionId;
    }
  }

  const nowIso = isoNow();
  const createSession = async () => {
    return supabase
      .from("chat_sessions")
      .insert({
        post_slug: postSlug,
        title: "New session",
        created_at: nowIso,
        updated_at: nowIso,
        expires_at: computeExpiry(),
      })
      .select("id")
      .single();
  };

  let { data: created, error: createError } = await createSession();

  if (createError?.code === "23503") {
    const ensured = await ensureChatPostReference(postSlug);

    if (ensured) {
      const retry = await createSession();
      created = retry.data;
      createError = retry.error;
    }
  }

  if (createError) {
    return createOrReuseRuntimeSession(postSlug, sessionId);
  }

  if (created?.id) {
    return created.id as string;
  }

  return createOrReuseRuntimeSession(postSlug, sessionId);
}

export async function appendChatMessage(input: {
  postSlug: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources?: ChatMessageSource[];
}) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return appendRuntimeChatMessage(input);
  }

  const nowIso = isoNow();

  const messagePayload = {
    session_id: input.sessionId,
    role: input.role,
    content: input.content,
    sources: input.sources ?? [],
    created_at: nowIso,
  };

  const { data, error: insertError } = await supabase
    .from("chat_messages")
    .insert(messagePayload)
    .select("id,session_id,role,content,sources,created_at")
    .single();

  if (insertError) {
    return appendRuntimeChatMessage(input);
  }

  const sessionPatch: { updated_at: string; expires_at: string; title?: string } = {
    updated_at: nowIso,
    expires_at: computeExpiry(),
  };

  if (input.role === "user") {
    const { data: sessionData } = await supabase
      .from("chat_sessions")
      .select("title")
      .eq("id", input.sessionId)
      .single();

    if (typeof sessionData?.title !== "string" || sessionData.title.trim() === "" || sessionData.title === "New session") {
      sessionPatch.title = trimSessionTitle(input.content);
    }
  }

  const { error: updateError } = await supabase
    .from("chat_sessions")
    .update(sessionPatch)
    .eq("id", input.sessionId)
    .eq("post_slug", input.postSlug);

  if (updateError) {
    return appendRuntimeChatMessage(input);
  }

  if (!data) {
    return {
      id: randomUUID(),
      role: input.role,
      content: input.content,
      createdAt: nowIso,
      sources: input.sources,
    };
  }

  return mapMessageRow(data as ChatMessageRow);
}

export async function compactChatSessionMemory(postSlug: string, sessionId: string) {
  const supabase = getSupabaseServerClient();
  const nowIso = isoNow();

  if (!supabase) {
    cleanupRuntimeSessions(postSlug);
    const sessions = runtimeSessions.get(postSlug) ?? [];
    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return;
    }

    const messages = getRuntimeMessages(sessionId);
    const compacted = compactDialogMemory(session.memorySummary, messages);

    if (compacted.compactedIds.length === 0) {
      return;
    }

    session.memorySummary = compacted.nextSummary;
    session.updatedAt = nowIso;
    session.expiresAt = computeExpiry();
    runtimeSessions.set(postSlug, sessions);

    const compactedIdSet = new Set(compacted.compactedIds);
    const remaining = messages.filter((message) => !compactedIdSet.has(message.id));
    const summaryIndex = remaining.findIndex((message) => isSummaryMessage(message));

    if (summaryIndex >= 0) {
      remaining[summaryIndex] = {
        ...remaining[summaryIndex],
        content: encodeSummary(compacted.nextSummary),
      };
    } else {
      remaining.unshift({
        id: randomUUID(),
        role: "system",
        content: encodeSummary(compacted.nextSummary),
        createdAt: nowIso,
      });
    }

    runtimeMessages.set(sessionId, remaining.slice(-MAX_MESSAGES));
    return;
  }

  const { data: messageData, error: messageError } = await supabase
    .from("chat_messages")
    .select("id,session_id,role,content,sources,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES);

  if (messageError || !Array.isArray(messageData) || messageData.length === 0) {
    return;
  }

  const allMessages = (messageData as ChatMessageRow[]).map((item) => mapMessageRow(item));
  const currentSummary = allMessages.find((item) => isSummaryMessage(item))
    ? decodeSummary(allMessages.find((item) => isSummaryMessage(item))?.content ?? "")
    : "";
  const compacted = compactDialogMemory(currentSummary, allMessages);

  if (compacted.compactedIds.length === 0) {
    return;
  }

  const compactedIdSet = new Set(compacted.compactedIds);
  const existingSummary = allMessages.find((item) => isSummaryMessage(item));

  if (existingSummary) {
    await supabase
      .from("chat_messages")
      .update({
        content: encodeSummary(compacted.nextSummary),
        created_at: nowIso,
      })
      .eq("id", existingSummary.id)
      .eq("session_id", sessionId);
  } else {
    await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "system",
        content: encodeSummary(compacted.nextSummary),
        sources: [],
        created_at: nowIso,
      });
  }

  await supabase
    .from("chat_messages")
    .delete()
    .in("id", [...compactedIdSet])
    .eq("session_id", sessionId);

  await supabase
    .from("chat_sessions")
    .update({
      updated_at: nowIso,
      expires_at: computeExpiry(),
    })
    .eq("id", sessionId)
    .eq("post_slug", postSlug);
}

export async function deleteChatSession(postSlug: string, sessionId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return deleteRuntimeChatSession(postSlug, sessionId);
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("post_slug", postSlug)
    .select("id")
    .single();

  if (error?.code === "PGRST116") {
    return false;
  }

  if (error) {
    return deleteRuntimeChatSession(postSlug, sessionId);
  }

  return Boolean(data?.id);
}
