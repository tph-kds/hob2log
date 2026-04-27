import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChatMessage, ChatMessageSource, ChatRole, ChatSessionSummary } from "@/types/chat";

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 24;
const MAX_MESSAGES = 80;

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
}

const runtimeSessions = new Map<string, RuntimeSession[]>();
const runtimeMessages = new Map<string, ChatMessage[]>();

function isoNow() {
  return new Date().toISOString();
}

function computeExpiry(now: number = Date.now()) {
  return new Date(now + SESSION_TTL_MS).toISOString();
}

function mapSessionRow(session: ChatSessionRow, messageCount: number): ChatSessionSummary {
  return {
    id: session.id,
    postSlug: session.post_slug,
    title: session.title ?? "New session",
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    expiresAt: session.expires_at,
    messageCount,
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

function cleanupRuntimeSessions(postSlug: string) {
  const sessions = runtimeSessions.get(postSlug);

  if (!sessions) {
    return;
  }

  const now = Date.now();
  const active = sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  runtimeSessions.set(postSlug, active);
}

function getRuntimeMessages(sessionId: string) {
  return runtimeMessages.get(sessionId) ?? [];
}

export async function listChatSessions(postSlug: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    cleanupRuntimeSessions(postSlug);
    const sessions = runtimeSessions.get(postSlug) ?? [];
    return sessions
      .map((session) => ({
        id: session.id,
        postSlug: session.postSlug,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        messageCount: getRuntimeMessages(session.id).length,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  await supabase.from("chat_sessions").delete().lte("expires_at", isoNow());

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id,post_slug,title,created_at,updated_at,expires_at")
    .eq("post_slug", postSlug)
    .gt("expires_at", isoNow())
    .order("updated_at", { ascending: false })
    .limit(MAX_SESSIONS);

  if (sessionsError || !Array.isArray(sessionsData) || sessionsData.length === 0) {
    return [];
  }

  const ids = sessionsData.map((session) => session.id);
  const { data: countsData, error: countsError } = await supabase
    .from("chat_messages")
    .select("session_id,id")
    .in("session_id", ids)
    .order("created_at", { ascending: true });

  const countBySession = new Map<string, number>();

  if (!countsError && Array.isArray(countsData)) {
    for (const item of countsData as Array<{ session_id: string }>) {
      countBySession.set(item.session_id, (countBySession.get(item.session_id) ?? 0) + 1);
    }
  }

  return (sessionsData as ChatSessionRow[]).map((session) => mapSessionRow(session, countBySession.get(session.id) ?? 0));
}

export async function getChatSessionMessages(postSlug: string, sessionId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    cleanupRuntimeSessions(postSlug);
    const session = (runtimeSessions.get(postSlug) ?? []).find((item) => item.id === sessionId);

    if (!session) {
      return null;
    }

    const messages = getRuntimeMessages(sessionId);

    return {
      session: {
        id: session.id,
        postSlug: session.postSlug,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        messageCount: messages.length,
      },
      messages,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id,post_slug,title,created_at,updated_at,expires_at")
    .eq("id", sessionId)
    .eq("post_slug", postSlug)
    .gt("expires_at", isoNow())
    .single();

  if (sessionError || !sessionData) {
    return null;
  }

  const { data: messageData, error: messageError } = await supabase
    .from("chat_messages")
    .select("id,session_id,role,content,sources,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES);

  const messages = !messageError && Array.isArray(messageData)
    ? (messageData as ChatMessageRow[]).map((item) => mapMessageRow(item))
    : [];

  return {
    session: mapSessionRow(sessionData as ChatSessionRow, messages.length),
    messages,
  };
}

export async function createOrReuseSession(postSlug: string, sessionId?: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
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
    };

    const merged = [next, ...sessions].slice(0, MAX_SESSIONS);
    runtimeSessions.set(postSlug, merged);
    return next.id;
  }

  if (sessionId) {
    const { data } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("post_slug", postSlug)
      .gt("expires_at", isoNow())
      .single();

    if (data?.id) {
      await supabase
        .from("chat_sessions")
        .update({ updated_at: isoNow(), expires_at: computeExpiry() })
        .eq("id", sessionId);

      return sessionId;
    }
  }

  const nowIso = isoNow();
  const { data: created } = await supabase
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

  if (created?.id) {
    return created.id as string;
  }

  return randomUUID();
}

export async function appendChatMessage(input: {
  postSlug: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources?: ChatMessageSource[];
}) {
  const supabase = getSupabaseServerClient();
  const nowIso = isoNow();

  if (!supabase) {
    cleanupRuntimeSessions(input.postSlug);
    const sessions = runtimeSessions.get(input.postSlug) ?? [];
    const session = sessions.find((item) => item.id === input.sessionId);

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

  const messagePayload = {
    session_id: input.sessionId,
    role: input.role,
    content: input.content,
    sources: input.sources ?? [],
    created_at: nowIso,
  };

  const { data } = await supabase
    .from("chat_messages")
    .insert(messagePayload)
    .select("id,session_id,role,content,sources,created_at")
    .single();

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

  await supabase
    .from("chat_sessions")
    .update(sessionPatch)
    .eq("id", input.sessionId)
    .eq("post_slug", input.postSlug);

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

export async function deleteChatSession(postSlug: string, sessionId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    cleanupRuntimeSessions(postSlug);
    const sessions = runtimeSessions.get(postSlug) ?? [];
    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    runtimeSessions.set(postSlug, nextSessions);
    runtimeMessages.delete(sessionId);
    return sessions.length !== nextSessions.length;
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
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}
