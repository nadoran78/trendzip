package com.mztrend.service.crawling

enum class KeywordExplainRefreshReason {
    NEW_KEYWORD,
    MISSING_EXPLAIN,
    FIRST_CONTINUED,
    LONG_RUNNING,
    RE_ENTRY,
    RANK_SURGED,
}
