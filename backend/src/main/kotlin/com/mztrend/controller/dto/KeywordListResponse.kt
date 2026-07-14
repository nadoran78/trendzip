package com.mztrend.controller.dto

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend

data class KeywordListResponse(
    val generation: Generation,
    val keywords: List<KeywordSummaryResponse>,
)

data class KeywordSummaryResponse(
    val id: Long,
    val word: String,
    val rank: Int?,
    val category: String?,
    val trendScore: Long?,
    val rankTrend: RankTrend?,
    val rankDelta: Int?,
)
