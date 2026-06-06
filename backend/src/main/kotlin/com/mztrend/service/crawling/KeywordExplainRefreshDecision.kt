package com.mztrend.service.crawling

data class KeywordExplainRefreshDecision(
    val keyword: CollectedKeyword,
    val reason: KeywordExplainRefreshReason,
    val previousExplain: String? = null,
    val previousRank: Int? = null,
    val consecutiveWeeks: Int = 1,
) {
    init {
        require(consecutiveWeeks > 0) { "Keyword explain consecutive weeks must be positive." }
    }
}
