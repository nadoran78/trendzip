import "server-only";

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function getGoogleTagManagerId(): string | null {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();

  if (!gtmId) {
    return null;
  }

  if (!GTM_ID_PATTERN.test(gtmId)) {
    throw new Error("NEXT_PUBLIC_GTM_ID must use the GTM-XXXXXXX format.");
  }

  return gtmId;
}
