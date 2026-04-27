import { ChatModelOption, ChatProvider } from "@/types/chat";

interface ModelCatalogInput {
  provider: ChatProvider;
  apiKey?: string;
}

interface ModelCatalogResult {
  models: ChatModelOption[];
  source: "live" | "fallback";
}

const OPENROUTER_LIMIT = 120;
const OPENAI_LIMIT = 80;
const GEMINI_LIMIT = 80;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;

interface ModelCacheEntry {
  models: ChatModelOption[];
  fetchedAt: number;
}

const providerModelCache = new Map<ChatProvider, ModelCacheEntry>();

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

function trimModelName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEnvFirst(names: string[]) {
  for (const name of names) {
    const value = process.env[name];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function dedupeModels(models: ChatModelOption[]) {
  const seen = new Set<string>();
  const next: ChatModelOption[] = [];

  for (const item of models) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    next.push(item);
  }

  return next;
}

function getCachedModels(provider: ChatProvider) {
  const cacheEntry = providerModelCache.get(provider);

  if (!cacheEntry) {
    return null;
  }

  const isFresh = (Date.now() - cacheEntry.fetchedAt) < MODEL_CACHE_TTL_MS;
  return isFresh ? cacheEntry.models : null;
}

function updateModelCache(provider: ChatProvider, models: ChatModelOption[]) {
  providerModelCache.set(provider, {
    models,
    fetchedAt: Date.now(),
  });
}

function getOpenAIKey(override?: string) {
  return override?.trim() || getEnvFirst(["OPENAI_API_KEY"]);
}

function getGeminiKey(override?: string) {
  return override?.trim() || getEnvFirst(["GEMINI_API_KEY", "GOOGLE_API_KEY"]);
}

function getOpenRouterKey(override?: string) {
  return override?.trim() || getEnvFirst(["OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"]);
}

async function fetchOpenRouterModels(apiKey?: string) {
  const key = getOpenRouterKey(apiKey);
  const { signal, done } = withTimeoutSignal(8000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (key) {
      headers.Authorization = `Bearer ${key}`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers,
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`OpenRouter models failed with status ${response.status}`);
    }

    const payload = await response.json() as {
      data?: Array<{ id?: string; created?: number }>;
    };

    const models = (payload.data ?? [])
      .map((item) => ({
        id: trimModelName(item.id),
        created: typeof item.created === "number" ? item.created : 0,
      }))
      .filter((item): item is { id: string; created: number } => Boolean(item.id))
      .sort((a, b) => b.created - a.created)
      .slice(0, OPENROUTER_LIMIT)
      .map((item) => ({ id: item.id, label: item.id }));

    return dedupeModels(models);
  } finally {
    done();
  }
}

function isOpenAIChatCapableModel(modelId: string) {
  const id = modelId.toLowerCase();

  if (id.includes("embedding") || id.includes("moderation") || id.includes("whisper") || id.includes("tts") || id.includes("transcribe")) {
    return false;
  }

  if (id.includes("image") || id.includes("dall-e") || id.includes("realtime")) {
    return false;
  }

  return id.startsWith("gpt") || id.startsWith("o");
}

async function fetchOpenAIModels(apiKey?: string) {
  const key = getOpenAIKey(apiKey);

  if (!key) {
    throw new Error("Missing OpenAI API key");
  }

  const { signal, done } = withTimeoutSignal(8000);

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`OpenAI models failed with status ${response.status}`);
    }

    const payload = await response.json() as {
      data?: Array<{ id?: string; created?: number }>;
    };

    const models = (payload.data ?? [])
      .map((item) => ({
        id: trimModelName(item.id),
        created: typeof item.created === "number" ? item.created : 0,
      }))
      .filter((item): item is { id: string; created: number } => Boolean(item.id))
      .filter((item) => isOpenAIChatCapableModel(item.id))
      .sort((a, b) => b.created - a.created)
      .slice(0, OPENAI_LIMIT)
      .map((item) => ({ id: item.id, label: item.id }));

    return dedupeModels(models);
  } finally {
    done();
  }
}

async function fetchGeminiModels(apiKey?: string) {
  const key = getGeminiKey(apiKey);

  if (!key) {
    throw new Error("Missing Gemini API key");
  }

  const { signal, done } = withTimeoutSignal(8000);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Gemini models failed with status ${response.status}`);
    }

    const payload = await response.json() as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };

    const models = (payload.models ?? [])
      .filter((item) => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes("generateContent"))
      .map((item) => trimModelName(item.name))
      .filter((item): item is string => Boolean(item))
      .map((name) => name.startsWith("models/") ? name.slice(7) : name)
      .filter((name) => name.startsWith("gemini"))
      .slice(0, GEMINI_LIMIT)
      .map((id) => ({ id, label: id }));

    return dedupeModels(models);
  } finally {
    done();
  }
}

export function getDefaultModelForProvider(provider: ChatProvider) {
  if (provider === "openai") {
    return process.env.CHATBOT_OPENAI_MODEL || "gpt-4o-mini";
  }

  if (provider === "openrouter") {
    return process.env.CHATBOT_OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }

  if (provider === "gemini") {
    return process.env.CHATBOT_GEMINI_MODEL || "gemini-2.0-flash";
  }

  return "offline";
}

function buildFallbackModels(provider: ChatProvider) {
  if (provider === "offline") {
    return [{ id: "offline", label: "offline" }];
  }

  const defaultModel = getDefaultModelForProvider(provider);
  const staleCache = providerModelCache.get(provider)?.models ?? [];

  return dedupeModels([
    { id: defaultModel, label: defaultModel },
    ...staleCache,
  ]).slice(0, 40);
}

export async function getModelCatalog(input: ModelCatalogInput): Promise<ModelCatalogResult> {
  if (input.provider === "offline") {
    return {
      models: [{ id: "offline", label: "offline" }],
      source: "fallback",
    };
  }

  const cachedModels = getCachedModels(input.provider);

  if (cachedModels && cachedModels.length > 0) {
    return {
      models: cachedModels,
      source: "live",
    };
  }

  try {
    const liveModels = input.provider === "openrouter"
      ? await fetchOpenRouterModels(input.apiKey)
      : input.provider === "openai"
        ? await fetchOpenAIModels(input.apiKey)
        : await fetchGeminiModels(input.apiKey);

    if (liveModels.length > 0) {
      updateModelCache(input.provider, liveModels);

      return {
        models: liveModels,
        source: "live",
      };
    }
  } catch {
    // fall back to static list when provider API is not reachable
  }

  return {
    models: buildFallbackModels(input.provider),
    source: "fallback",
  };
}
