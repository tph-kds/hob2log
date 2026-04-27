import { ChatPromptMessage, ChatProvider } from "@/types/chat";
import { getDefaultModelForProvider } from "@/lib/llm/models";

interface GenerateResponseInput {
  provider?: ChatProvider;
  messages: ChatPromptMessage[];
  model?: string;
  apiKey?: string;
}

interface ResolvedProvider {
  provider: ChatProvider;
  key: string | null;
  model: string;
}

class ProviderHttpError extends Error {
  status: number;
  provider: ChatProvider;
  retryAfterSeconds?: number;

  constructor(provider: ChatProvider, status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.provider = provider;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getEnvFirst(names: string[]) {
  for (const name of names) {
    const value = process.env[name];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeProvider(value?: ChatProvider) {
  if (value === "openai" || value === "gemini" || value === "openrouter" || value === "offline") {
    return value;
  }

  const fromEnv = process.env.CHATBOT_DEFAULT_PROVIDER;

  if (fromEnv === "openai" || fromEnv === "gemini" || fromEnv === "openrouter" || fromEnv === "offline") {
    return fromEnv;
  }

  return "offline";
}

function sanitizeModel(value: string | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 120) {
    return null;
  }

  return trimmed;
}

function getProviderConfig(provider: ChatProvider, model?: string, overrideKey?: string): ResolvedProvider {
  const selectedModel = sanitizeModel(model) || getDefaultModelForProvider(provider);
  const providedKey = overrideKey?.trim() || null;

  if (provider === "openai") {
    return {
      provider,
      key: providedKey || getEnvFirst(["OPENAI_API_KEY"]),
      model: selectedModel,
    };
  }

  if (provider === "gemini") {
    return {
      provider,
      key: providedKey || getEnvFirst(["GEMINI_API_KEY", "GOOGLE_API_KEY"]),
      model: selectedModel,
    };
  }

  if (provider === "openrouter") {
    return {
      provider,
      key: providedKey || getEnvFirst(["OPENROUTER_API_KEY", "OPEN_ROUTER_API_KEY"]),
      model: selectedModel,
    };
  }

  return {
    provider: "offline",
    key: null,
    model: "offline",
  };
}

function toContextExcerpt(messages: ChatPromptMessage[]) {
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";
  const context = messages.find((item) => item.role === "system" && item.content.includes("Retrieved Context:"))?.content ?? "";

  const contextStart = context.indexOf("Retrieved Context:");
  const contextBlock = contextStart >= 0 ? context.slice(contextStart + "Retrieved Context:".length).trim() : "";
  const firstSource = contextBlock
    .split("\n\n")
    .map((entry) => entry.trim())
    .find(Boolean);

  if (!firstSource) {
    return `I can still help from local blog context. Your question was: "${lastUser}".`;
  }

  return [
    "Based on the retrieved article context, here is the most relevant excerpt:",
    firstSource,
    `Question: ${lastUser}`,
  ].join("\n\n");
}

function toMissingKeyFallback(provider: ChatProvider, messages: ChatPromptMessage[]) {
  return [
    `The ${provider} provider is selected, but no API key is available from the request or server environment.`,
    "Set the provider key in server env (or paste it in the chat panel) and retry.",
    toContextExcerpt(messages),
  ].join("\n\n");
}

function parseRetryAfterSeconds(value: string | null) {
  if (!value) {
    return undefined;
  }

  const asNumber = Number(value);

  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.floor(asNumber);
  }

  const dateMs = Date.parse(value);

  if (!Number.isFinite(dateMs)) {
    return undefined;
  }

  const diffMs = dateMs - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : undefined;
}

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;

    if (typeof maybeError === "string") {
      return maybeError;
    }

    if (maybeError && typeof maybeError === "object" && typeof (maybeError as { message?: unknown }).message === "string") {
      return (maybeError as { message: string }).message;
    }
  }

  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return getErrorMessage(JSON.parse(text));
    } catch {
      return text.slice(0, 220);
    }
  } catch {
    return null;
  }
}

function toProviderFailureFallback(input: {
  provider: ChatProvider;
  status?: number;
  retryAfterSeconds?: number;
  messages: ChatPromptMessage[];
}) {
  const baseOffline = toContextExcerpt(input.messages);

  if (typeof input.status !== "number") {
    return baseOffline;
  }

  if (input.status === 429) {
    const retryHint = input.retryAfterSeconds && input.retryAfterSeconds > 0
      ? ` Please retry in about ${input.retryAfterSeconds}s.`
      : " Please retry in a short while.";

    return `The ${input.provider} provider is currently rate-limited (429).${retryHint}\n\n${baseOffline}`;
  }

  if (input.status >= 500) {
    return `The ${input.provider} provider is temporarily unavailable (${input.status}).\n\n${baseOffline}`;
  }

  return `The ${input.provider} provider request failed (${input.status}).\n\n${baseOffline}`;
}

async function callOpenAI(input: ResolvedProvider, messages: ChatPromptMessage[]) {
  if (!input.key) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.key}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.25,
      max_tokens: 640,
      messages,
    }),
  });

  if (!response.ok) {
    const details = await readErrorBody(response);
    throw new ProviderHttpError(
      "openai",
      response.status,
      details || `OpenAI request failed with status ${response.status}`,
      parseRetryAfterSeconds(response.headers.get("retry-after")),
    );
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

async function callGemini(input: ResolvedProvider, messages: ChatPromptMessage[]) {
  if (!input.key) {
    return null;
  }

  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const conversation = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        role: "system",
        parts: [{ text: system }],
      },
      contents: conversation,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 700,
      },
    }),
  });

  if (!response.ok) {
    const details = await readErrorBody(response);
    throw new ProviderHttpError(
      "gemini",
      response.status,
      details || `Gemini request failed with status ${response.status}`,
      parseRetryAfterSeconds(response.headers.get("retry-after")),
    );
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  return text || null;
}

async function callOpenRouter(input: ResolvedProvider, messages: ChatPromptMessage[]) {
  if (!input.key) {
    return null;
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.key}`,
      "HTTP-Referer": process.env.CHATBOT_SITE_URL || "https://localhost",
      "X-Title": process.env.CHATBOT_APP_NAME || "hob2log",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.25,
      max_tokens: 640,
      messages,
    }),
  });

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"));

    if (response.status === 429) {
      const waitSeconds = Math.min(Math.max(retryAfterSeconds ?? 1, 1), 4);
      await delay(waitSeconds * 1000);

      const retryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.key}`,
          "HTTP-Referer": process.env.CHATBOT_SITE_URL || "https://localhost",
          "X-Title": process.env.CHATBOT_APP_NAME || "hob2log",
        },
        body: JSON.stringify({
          model: input.model,
          temperature: 0.25,
          max_tokens: 640,
          messages,
        }),
      });

      if (retryResponse.ok) {
        const payload = await retryResponse.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        return payload.choices?.[0]?.message?.content?.trim() ?? null;
      }

      const retryDetails = await readErrorBody(retryResponse);
      throw new ProviderHttpError(
        "openrouter",
        retryResponse.status,
        retryDetails || `OpenRouter retry failed with status ${retryResponse.status}`,
        parseRetryAfterSeconds(retryResponse.headers.get("retry-after")),
      );
    }

    const details = await readErrorBody(response);
    throw new ProviderHttpError(
      "openrouter",
      response.status,
      details || `OpenRouter request failed with status ${response.status}`,
      retryAfterSeconds,
    );
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function generateAssistantResponse(input: GenerateResponseInput) {
  const provider = normalizeProvider(input.provider);
  const resolved = getProviderConfig(provider, input.model, input.apiKey);

  if (resolved.provider === "offline") {
    return {
      provider: "offline" as const,
      model: resolved.model,
      text: toContextExcerpt(input.messages),
    };
  }

  let text: string | null = null;

  try {
    text = resolved.provider === "openai"
      ? await callOpenAI(resolved, input.messages)
      : resolved.provider === "gemini"
        ? await callGemini(resolved, input.messages)
        : await callOpenRouter(resolved, input.messages);
  } catch (error) {
    const providerError = error instanceof ProviderHttpError ? error : null;

    return {
      provider: "offline" as const,
      model: resolved.model,
      text: toProviderFailureFallback({
        provider: resolved.provider,
        status: providerError?.status,
        retryAfterSeconds: providerError?.retryAfterSeconds,
        messages: input.messages,
      }),
    };
  }

  if (!text) {
    const missingKey = !resolved.key;

    return {
      provider: "offline" as const,
      model: resolved.model,
      text: missingKey
        ? toMissingKeyFallback(resolved.provider, input.messages)
        : `The ${resolved.provider} provider returned an empty response.\n\n${toContextExcerpt(input.messages)}`,
    };
  }

  return {
    provider: resolved.provider,
    model: resolved.model,
    text,
  };
}
