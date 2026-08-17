import type { FeedSection, Generation } from "@/types/api";

type AnalyticsEventMap = {
  select_generation: {
    generation: Generation;
    entry_point: "landing";
  };
  generation_change: {
    from_generation: Generation;
    to_generation: Generation;
    content_view: "feed" | "trend";
  };
  youtube_video_click: {
    generation: Generation;
    video_id: string;
    keyword_id: number;
    keyword: string;
    feed_section: FeedSection | "UNKNOWN";
    click_area: "feed_thumbnail" | "feed_title" | "keyword_related_video";
  };
  view_keyword_detail: {
    generation: Generation;
    keyword_id: number;
    keyword: string;
    rank?: number;
    keyword_category?: string;
  };
  related_keyword_click: {
    generation: Generation;
    keyword_id: number;
    related_keyword_id: number;
    related_keyword: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
export type AnalyticsEventParameters<Name extends AnalyticsEventName> =
  AnalyticsEventMap[Name];

export function trackAnalyticsEvent<Name extends AnalyticsEventName>(
  event: Name,
  parameters: AnalyticsEventParameters<Name>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(removeUndefinedValues({ event, ...parameters }));
}

function removeUndefinedValues(
  values: Record<string, string | number | undefined>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined,
    ),
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
