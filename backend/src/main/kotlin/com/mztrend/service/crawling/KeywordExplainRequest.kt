package com.mztrend.service.crawling

import com.mztrend.domain.Generation

data class KeywordExplainRequest(
    val generation: Generation,
    val keyword: CollectedKeyword,
    val refreshReason: KeywordExplainRefreshReason,
    val previousExplain: String? = null,
    val previousRank: Int? = null,
    val consecutiveWeeks: Int = 1,
    val videos: List<CollectedVideo>,
) {
    init {
        require(consecutiveWeeks > 0) { "Keyword explain consecutive weeks must be positive." }
    }
}
