export const ANALYTICS_CONSENT_STORAGE_KEY =
  "trendzip.analytics-consent.v1";
const ANALYTICS_CONSENT_CHANGE_EVENT = "trendzip:analytics-consent-change";

export type AnalyticsConsentChoice = "granted" | "denied";

type GoogleConsentValue = "granted" | "denied";

type GoogleConsentState = {
  analytics_storage: GoogleConsentValue;
  ad_storage: "denied";
  ad_user_data: "denied";
  ad_personalization: "denied";
};

export function createConsentBootstrapScript(): string {
  const storageKey = JSON.stringify(ANALYTICS_CONSENT_STORAGE_KEY);

  return `
    (function () {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

      var storedConsent = null;
      try {
        storedConsent = window.localStorage.getItem(${storageKey});
      } catch (_) {}

      var analyticsStorage = storedConsent === "granted" ? "granted" : "denied";
      var consentState = {
        analytics_storage: analyticsStorage,
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      };

      if (storedConsent !== "granted" && storedConsent !== "denied") {
        consentState.wait_for_update = 500;
      }

      window.gtag("consent", "default", consentState);
      window.gtag("set", "ads_data_redaction", true);
    })();
  `;
}

export function readAnalyticsConsent(): AnalyticsConsentChoice | null {
  try {
    const storedConsent = window.localStorage.getItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
    );

    return storedConsent === "granted" || storedConsent === "denied"
      ? storedConsent
      : null;
  } catch {
    return null;
  }
}

export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === ANALYTICS_CONSENT_STORAGE_KEY) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ANALYTICS_CONSENT_CHANGE_EVENT, onChange);
  };
}

export function applyAnalyticsConsent(choice: AnalyticsConsentChoice): void {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, choice);
  } catch {
    // The current-page choice still applies when browser storage is unavailable.
  }

  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGE_EVENT));

  window.gtag?.("consent", "update", createGoogleConsentState(choice));

  if (choice === "denied") {
    clearGoogleAnalyticsCookies();
  }
}

function createGoogleConsentState(
  choice: AnalyticsConsentChoice,
): GoogleConsentState {
  return {
    analytics_storage: choice,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };
}

function clearGoogleAnalyticsCookies(): void {
  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter(
      (cookieName): cookieName is string =>
        cookieName === "_gid" ||
        cookieName === "_gat" ||
        cookieName.startsWith("_ga"),
    );
  const domain = getRegistrableDomain(window.location.hostname);

  cookieNames.forEach((cookieName) => {
    expireCookie(cookieName);
    expireCookie(cookieName, window.location.hostname);

    if (domain !== window.location.hostname) {
      expireCookie(cookieName, domain);
      expireCookie(cookieName, `.${domain}`);
    }
  });
}

function expireCookie(cookieName: string, domain?: string): void {
  const domainAttribute = domain ? `; domain=${domain}` : "";
  document.cookie = `${cookieName}=; Max-Age=0; path=/${domainAttribute}; SameSite=Lax`;
}

function getRegistrableDomain(hostname: string): string {
  if (hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return hostname;
  }

  const labels = hostname.split(".");
  return labels.length > 2 ? labels.slice(-2).join(".") : hostname;
}
