"use client";

import { useEffect, useRef } from "react";

import {
  type AnalyticsEventName,
  type AnalyticsEventParameters,
  trackAnalyticsEvent,
} from "@/lib/analytics/events";

type TrackAnalyticsEventProps<Name extends AnalyticsEventName> = {
  event: Name;
  parameters: AnalyticsEventParameters<Name>;
};

export function TrackAnalyticsEvent<Name extends AnalyticsEventName>({
  event,
  parameters,
}: TrackAnalyticsEventProps<Name>) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) {
      return;
    }

    hasTracked.current = true;
    trackAnalyticsEvent(event, parameters);
  }, [event, parameters]);

  return null;
}
