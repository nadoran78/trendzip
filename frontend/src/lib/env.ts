import "server-only";

const API_BASE_URL_ENV = "API_BASE_URL";

export function getApiBaseUrl(): string {
  const baseUrl = process.env[API_BASE_URL_ENV]?.trim();

  if (!baseUrl) {
    throw new Error(`${API_BASE_URL_ENV} is required.`);
  }

  return baseUrl.replace(/\/+$/, "");
}
