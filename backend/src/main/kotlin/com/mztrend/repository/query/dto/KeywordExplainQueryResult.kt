package com.mztrend.repository.query.dto

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import java.time.LocalDateTime

data class KeywordExplainQueryResult(
    val id: Long,
    val word: String,
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
)
