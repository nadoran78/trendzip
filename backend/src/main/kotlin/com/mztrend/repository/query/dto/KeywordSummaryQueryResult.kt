package com.mztrend.repository.query.dto

import com.mztrend.domain.RankTrend

data class KeywordSummaryQueryResult(
    val id: Long,
    val word: String,
    val rank: Int?,
    val category: String?,
    val trendScore: Long?,
    val rankTrend: RankTrend?,
    val rankDelta: Int?,
)
