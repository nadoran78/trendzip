package com.mztrend.controller.dto

import java.time.LocalDate

data class KeywordExplainResponse(
    val keyword: String,
    val explain: String?,
    val relatedVideos: List<FeedVideoResponse>,
    val trendGraph: List<TrendGraphPointResponse>,
    val relatedKeywords: List<KeywordSummaryResponse>,
)

data class TrendGraphPointResponse(
    val period: LocalDate,
    val ratio: Long?,
)
