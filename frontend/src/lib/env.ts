import "server-only";

const API_BASE_URL_ENV = "API_BASE_URL";
const CLOUDFLARE_ACCESS_CLIENT_ID_ENV = "CLOUDFLARE_ACCESS_CLIENT_ID";
const CLOUDFLARE_ACCESS_CLIENT_SECRET_ENV = "CLOUDFLARE_ACCESS_CLIENT_SECRET";

export type CloudflareAccessCredentials = {
  clientId: string;
  clientSecret: string;
};

export function getApiBaseUrl(): string {
  const baseUrl = process.env[API_BASE_URL_ENV]?.trim();

  if (!baseUrl) {
    throw new Error(`${API_BASE_URL_ENV} is required.`);
  }

  return baseUrl.replace(/\/+$/, "");
}

export function getCloudflareAccessCredentials(): CloudflareAccessCredentials | null {
  const clientId = process.env[CLOUDFLARE_ACCESS_CLIENT_ID_ENV]?.trim();
  const clientSecret =
    process.env[CLOUDFLARE_ACCESS_CLIENT_SECRET_ENV]?.trim();

  if (!clientId && !clientSecret) {
    return null;
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      `${CLOUDFLARE_ACCESS_CLIENT_ID_ENV} and ${CLOUDFLARE_ACCESS_CLIENT_SECRET_ENV} must be configured together.`,
    );
  }

  return { clientId, clientSecret };
}
