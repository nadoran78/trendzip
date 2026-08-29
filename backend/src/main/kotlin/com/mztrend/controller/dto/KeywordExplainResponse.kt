package com.mztrend.controller.dto

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import java.time.LocalDate
import java.time.LocalDateTime

data class KeywordExplainResponse(
    val keywordId: Long,
    val keyword: String,
    val generation: Generation,
    val category: String?,
    val rank: Int?,
    val trendScore: Long?,
    val rankTrend: RankTrend?,
    val rankDelta: Int?,
    val explain: String?,
    val sourceCrawlRunId: Long?,
    val snapshotAt: LocalDateTime?,
    val explainedAt: LocalDateTime?,
    val relatedVideos: List<FeedVideoResponse>,
    val trendGraph: List<TrendGraphPointResponse>,
    val relatedKeywords: List<KeywordSummaryResponse>,
)

data class TrendGraphPointResponse(
    val period: LocalDate,
    val ratio: Long?,
    val rank: Int?,
)
