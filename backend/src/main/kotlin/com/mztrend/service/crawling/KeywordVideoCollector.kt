package com.mztrend.service.crawling

import com.mztrend.domain.Generation
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword

interface KeywordVideoCollector {
    fun collect(
        generation: Generation,
        scoredKeywords: List<ScoredTrendKeyword>,
    ): CollectedKeywordVideoBatch
}
