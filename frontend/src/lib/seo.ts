import type { Metadata } from "next";

export const SITE_NAME = "trendzip";
export const SITE_URL = new URL("https://trendzip.nadoran.com");
export const DEFAULT_TITLE = "trendzip | 10대·20대 유튜브 트렌드";
export const DEFAULT_DESCRIPTION =
  "10대와 20대가 지금 보는 유튜브 영상과 인기 키워드가 왜 뜨는지 확인하세요.";
export const SOCIAL_IMAGE_ALT =
  "trendzip - 10대와 20대의 실시간 유튜브 트렌드";
export const SOCIAL_IMAGE_SIZE = {
  width: 1200,
  height: 630,
} as const;

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  const hasSiteName =
    title.startsWith(`${SITE_NAME} |`) || title.endsWith(`| ${SITE_NAME}`);
  const socialTitle = hasSiteName
    ? title
    : `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: path,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: SOCIAL_IMAGE_SIZE.width,
          height: SOCIAL_IMAGE_SIZE.height,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [
        {
          url: "/twitter-image",
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
  };
}

export function createMetadataDescription(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.replace(/\s+/g, " ").trim() || fallback;
  const maxLength = 160;

  if (normalized.length <= maxLength) return normalized;

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function toAbsoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
