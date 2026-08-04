import "server-only";

import { cache } from "react";

import { getKeywordExplain } from "@/services/trend-api";

export const getKeywordDetail = cache((id: number) =>
  getKeywordExplain(id, {
    cache: "no-store",
  }),
);
