import { getApiBaseUrl } from "@/lib/env";
import type { ApiResponse } from "@/types/api";

type QueryValue = string | number | boolean | null | undefined;

const DEFAULT_API_REQUEST_TIMEOUT_MS = 10_000;

export type FetchApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  query?: Record<string, QueryValue>;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function fetchApi<T>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const signal =
    options.signal ?? AbortSignal.timeout(DEFAULT_API_REQUEST_TIMEOUT_MS);
  const response = await fetch(buildApiUrl(path, options.query), {
    ...options,
    signal,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  const responseBody = await readJson<ApiResponse<T>>(response);

  if (!response.ok) {
    throw new ApiClientError(
      responseBody?.error?.message ?? `API request failed. status=${response.status}`,
      response.status,
      responseBody?.error?.code,
    );
  }

  if (!responseBody?.success) {
    throw new ApiClientError(
      responseBody?.error?.message ?? "API request failed.",
      response.status,
      responseBody?.error?.code,
    );
  }

  if (responseBody.data === null) {
    throw new ApiClientError("API response data is empty.", response.status);
  }

  return responseBody.data;
}

function buildApiUrl(
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getApiBaseUrl()}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiClientError(
      `API response is not valid JSON. status=${response.status}`,
      response.status,
    );
  }
}
