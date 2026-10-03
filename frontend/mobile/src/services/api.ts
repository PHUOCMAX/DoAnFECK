import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../../../../shared/types/auth";

import type {
  CreatePoiRequest,
  CreatePoiResponse,
  PoisResponse,
} from "../../../../shared/types/poi";

const REQUEST_TIMEOUT_MS = 15_000;

const configuredApiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

console.log("API URL =", configuredApiUrl);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiUrl() {
  if (!configuredApiUrl) {
    throw new ApiError(
      "Chưa cấu hình EXPO_PUBLIC_API_URL. Hãy tạo file .env từ .env.example.",
      0
    );
  }

  return configuredApiUrl;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${getApiUrl()}${path}`,
      {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      }
    );

    const rawBody = await response.text();

    let body: { message?: string } | T | null = null;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as
          | { message?: string }
          | T;
      } catch {
        throw new ApiError(
          "Máy chủ trả về dữ liệu không hợp lệ.",
          response.status
        );
      }
    }

    if (!response.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body
          ? body.message
          : undefined;

      throw new ApiError(
        message ||
          "Không thể hoàn tất yêu cầu. Vui lòng thử lại.",
        response.status
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new ApiError(
        "Kết nối quá thời gian chờ. Vui lòng thử lại."
      );
    }

    throw new ApiError(
      "Không thể kết nối đến máy chủ."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================
   AUTH
========================= */

export function loginWithApi(
  credentials: LoginRequest
) {
  return request<LoginResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    }
  );
}

export function registerWithApi(
  credentials: RegisterRequest
) {
  return request<RegisterResponse>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    }
  );
}

/* =========================
   POI
========================= */

export function getPoisFromApi() {
  return request<PoisResponse>(
    "/api/pois",
    {
      method: "GET",
    }
  );
}

export function createPoiWithApi(
  poi: CreatePoiRequest,
  token: string
) {
  return request<CreatePoiResponse>(
    "/api/pois",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(poi),
    }
  );
}

/* =========================
   AI AGENT
========================= */

export interface AgentChatRequest {
  question: string;
  language: string;
}

export interface AgentChatData {
  answer: string;
  language: string;
  sources?: unknown[];
}

export interface AgentChatResponse {
  success: boolean;
  data: AgentChatData;
}

export async function chatWithAgent(
  question: string,
  language: string,
  token: string
) {
  return request<AgentChatResponse>(
    "/api/agent/chat",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        language,
      } satisfies AgentChatRequest),
    }
  );
}