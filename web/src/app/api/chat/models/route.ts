import { NextResponse } from "next/server";
import { getDefaultModelForProvider, getModelCatalog } from "@/lib/llm/models";
import { ChatProvider } from "@/types/chat";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface ModelCatalogRequest {
  provider?: ChatProvider;
  apiKey?: string;
}

function normalizeProvider(value: unknown): ChatProvider {
  if (value === "openai" || value === "openrouter" || value === "gemini" || value === "offline") {
    return value;
  }

  return "offline";
}

function sanitizeApiKey(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 8 ? trimmed : undefined;
}

export async function POST(request: Request) {
  let body: ModelCatalogRequest;

  try {
    body = await request.json() as ModelCatalogRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const provider = normalizeProvider(body.provider);
  const apiKey = sanitizeApiKey(body.apiKey);
  const catalog = await getModelCatalog({ provider, apiKey });
  const defaultModel = getDefaultModelForProvider(provider);

  return NextResponse.json({
    provider,
    source: catalog.source,
    models: catalog.models,
    defaultModel,
    fetchedAt: new Date().toISOString(),
  });
}
