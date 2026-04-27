import { NextResponse } from "next/server";
import { appendChatMessage, createOrReuseSession, deleteChatSession, getChatSessionMessages, listChatSessions } from "@/lib/chat-store";
import { getChatContext } from "@/lib/chat-retriever";
import { generateAssistantResponse } from "@/lib/llm/provider";
import { buildChatPrompt } from "@/lib/prompt/build-chat-prompt";
import { ChatRouteRequest } from "@/types/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

function sanitizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 1400);
}

function splitIntoChunks(value: string, chunkSize: number = 48) {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim();

  if (sessionId) {
    const payload = await getChatSessionMessages(slug, sessionId);

    if (!payload) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  }

  const sessions = await listChatSessions(slug);
  return NextResponse.json({ sessions });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "Session id is required" }, { status: 400 });
  }

  const deleted = await deleteChatSession(slug, sessionId);

  if (!deleted) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, sessionId });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  let body: ChatRouteRequest;

  try {
    body = await request.json() as ChatRouteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = sanitizeMessage(body.message);

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const contextPayload = await getChatContext(slug, message);

    if (!contextPayload.currentPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const sessionId = await createOrReuseSession(slug, body.sessionId);
    const existing = await getChatSessionMessages(slug, sessionId);
    const history = existing?.messages.map((item) => ({ role: item.role, content: item.content })) ?? [];

    const prompt = buildChatPrompt({
      post: contextPayload.currentPost,
      question: message,
      sources: contextPayload.sources,
      history,
    });

    await appendChatMessage({
      postSlug: slug,
      sessionId,
      role: "user",
      content: message,
    });

    const answer = await generateAssistantResponse({
      provider: body.provider,
      model: body.model,
      messages: prompt.messages,
      apiKey: body.apiKey,
    });

    await appendChatMessage({
      postSlug: slug,
      sessionId,
      role: "assistant",
      content: answer.text,
      sources: prompt.sourceList,
    });

    const metadata = {
      sessionId,
      provider: answer.provider,
      model: answer.model,
      sources: prompt.sourceList,
    };

    const encoder = new TextEncoder();
    const chunks = splitIntoChunks(answer.text);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`meta:${JSON.stringify(metadata)}\n`));

        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(`data:${chunk}\n`));
        }

        controller.enqueue(encoder.encode("done\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to complete chat request";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
