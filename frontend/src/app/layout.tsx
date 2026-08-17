import { SerwistProvider } from "@serwist/turbopack/react";
import { GoogleTagManager } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

import { AnalyticsConsentProvider } from "@/components/analytics/AnalyticsConsentProvider";
import { getGoogleTagManagerId } from "@/lib/analytics/analytics-env";
import { createConsentBootstrapScript } from "@/lib/analytics/consent";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  createPageMetadata,
} from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  ...createPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleTagManagerId = getGoogleTagManagerId();

  return (
    <html lang="ko">
      <head>
        <Script
          id="google-consent-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: createConsentBootstrapScript(),
          }}
        />
      </head>
      <body>
        <AnalyticsConsentProvider>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            disable={process.env.NODE_ENV !== "production"}
            cacheOnNavigation={false}
          >
            {children}
          </SerwistProvider>
        </AnalyticsConsentProvider>
        <Analytics />
        {googleTagManagerId ? (
          <GoogleTagManager gtmId={googleTagManagerId} />
        ) : null}
      </body>
    </html>
  );
}
