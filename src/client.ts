import {
  chatbotTranslationKeys,
  translateChatbotText,
  type ChatbotTranslate,
  type ChatbotTranslationKey,
} from "./i18n.js";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatbotUsage {
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
}

export interface ChatbotReply {
  reply: string;
  model: string;
  usage: ChatbotUsage;
}

export interface ChatbotUsageResponse {
  usage: ChatbotUsage;
}

export interface ChatbotClientOptions {
  endpoint?: string;
  credentials?: RequestCredentials;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  fetchFn?: typeof fetch;
  csrfCookieName?: string;
  csrfHeaderName?: string;
  bootstrapCsrf?: boolean;
  translate?: ChatbotTranslate;
}

interface ErrorPayload {
  error?: string;
  message?: string;
  usage?: ChatbotUsage;
}

export class ChatbotClientError extends Error {
  status: number;
  code?: string;
  usage?: ChatbotUsage;
  messageKey?: ChatbotTranslationKey;

  constructor(
    status: number,
    message: string,
    code?: string,
    usage?: ChatbotUsage,
    messageKey?: ChatbotTranslationKey
  ) {
    super(message);
    this.name = "ChatbotClientError";
    this.status = status;
    this.code = code;
    this.usage = usage;
    this.messageKey = messageKey;
  }
}

const DEFAULT_ENDPOINT = "/ai/chatbot";
const DEFAULT_CSRF_COOKIE_NAME = "csrf-token";
const DEFAULT_CSRF_HEADER_NAME = "x-csrf-token";

function resolveFetch(fetchFn?: typeof fetch, translate?: ChatbotTranslate): typeof fetch {
  const resolved = fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);
  if (!resolved) {
    throw new Error(translateChatbotText(chatbotTranslationKeys.noFetch, undefined, translate));
  }
  return resolved;
}

async function resolveHeaders(
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
): Promise<HeadersInit | undefined> {
  if (!headers) return undefined;
  if (typeof headers === "function") {
    return await headers();
  }
  return headers;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined" || typeof document.cookie !== "string") {
    return undefined;
  }

  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((value) => value.startsWith(`${name}=`));

  if (!entry) return undefined;

  const [, rawValue = ""] = entry.split("=");
  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function normalizeUsage(value: unknown): ChatbotUsage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const usage = value as Record<string, unknown>;
  if (
    typeof usage.limit !== "number" ||
    typeof usage.used !== "number" ||
    typeof usage.remaining !== "number" ||
    typeof usage.exhausted !== "boolean"
  ) {
    return undefined;
  }

  return {
    limit: usage.limit,
    used: usage.used,
    remaining: usage.remaining,
    exhausted: usage.exhausted,
  };
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageKeyForStatus(status: number): ChatbotTranslationKey {
  if (status === 401) {
    return chatbotTranslationKeys.signInRequired;
  }
  if (status === 429) {
    return chatbotTranslationKeys.usageLimitReached;
  }
  return chatbotTranslationKeys.requestFailed;
}

function normalizeError(
  status: number,
  body: unknown,
  translate?: ChatbotTranslate
): ChatbotClientError {
  const payload = body && typeof body === "object" ? (body as ErrorPayload) : undefined;
  const messageKey = messageKeyForStatus(status);
  const fallbackMessage = translateChatbotText(messageKey, undefined, translate);
  const message = payload?.message ?? fallbackMessage;

  return new ChatbotClientError(
    status,
    message,
    payload?.error,
    payload?.usage,
    messageKey
  );
}

async function ensureCsrfToken(
  fetcher: typeof fetch,
  endpoint: string,
  options: ChatbotClientOptions,
  baseHeaders: HeadersInit
): Promise<string | undefined> {
  const cookieName = options.csrfCookieName ?? DEFAULT_CSRF_COOKIE_NAME;
  const existing = readCookie(cookieName);
  if (existing || options.bootstrapCsrf === false) {
    return existing;
  }

  await fetcher(endpoint, {
    method: "GET",
    credentials: options.credentials ?? "include",
    headers: baseHeaders,
  });

  return readCookie(cookieName);
}

export async function getChatbotUsage(
  options: ChatbotClientOptions = {}
): Promise<ChatbotUsageResponse> {
  const fetcher = resolveFetch(options.fetchFn, options.translate);
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const customHeaders = await resolveHeaders(options.headers);

  const response = await fetcher(endpoint, {
    method: "GET",
    credentials: options.credentials ?? "include",
    headers: {
      Accept: "application/json",
      ...(customHeaders ?? {}),
    },
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw normalizeError(response.status, body, options.translate);
  }

  if (!body || typeof body !== "object") {
    throw new Error(
      translateChatbotText(chatbotTranslationKeys.invalidUsageResponse, undefined, options.translate)
    );
  }
  const usage = normalizeUsage((body as Record<string, unknown>).usage);
  if (!usage) {
    throw new Error(
      translateChatbotText(chatbotTranslationKeys.invalidUsageResponse, undefined, options.translate)
    );
  }

  return { usage };
}

export async function sendChatbotMessage(
  payload: {
    message: string;
    history?: ChatMessage[];
    systemPrompt?: string;
  },
  options: ChatbotClientOptions = {}
): Promise<ChatbotReply> {
  const fetcher = resolveFetch(options.fetchFn, options.translate);
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const customHeaders = await resolveHeaders(options.headers);
  const baseHeaders: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(customHeaders ?? {}),
  };

  const csrfToken = await ensureCsrfToken(fetcher, endpoint, options, baseHeaders);
  const csrfHeader = options.csrfHeaderName ?? DEFAULT_CSRF_HEADER_NAME;
  const requestHeaders = csrfToken
    ? {
        ...baseHeaders,
        [csrfHeader]: csrfToken,
      }
    : baseHeaders;

  const response = await fetcher(endpoint, {
    method: "POST",
    credentials: options.credentials ?? "include",
    headers: requestHeaders,
    body: JSON.stringify({
      message: payload.message,
      history: payload.history ?? [],
      systemPrompt: payload.systemPrompt,
    }),
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw normalizeError(response.status, body, options.translate);
  }

  if (!body || typeof body !== "object") {
    throw new Error(
      translateChatbotText(chatbotTranslationKeys.invalidResponse, undefined, options.translate)
    );
  }

  const content = body as Record<string, unknown>;
  const reply = content.reply;
  const model = content.model;
  const usage = normalizeUsage(content.usage);

  if (typeof reply !== "string" || typeof model !== "string" || !usage) {
    throw new Error(
      translateChatbotText(chatbotTranslationKeys.invalidResponse, undefined, options.translate)
    );
  }

  return { reply, model, usage };
}
