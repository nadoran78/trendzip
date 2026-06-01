package com.mztrend.service.crawling.candidate

import com.mztrend.domain.Generation
import java.time.LocalDateTime

data class ScoredTrendKeyword(
    val generation: Generation,
    val word: String,
    val rank: Int,
    val trendScore: Long,
    val averageRatio: Double,
    val maxRatio: Double,
    val source: TrendCandidateSourceType,
    val candidateScore: Long,
    val collectedAt: LocalDateTime,
) {
    init {
        require(word.isNotBlank()) { "Scored trend keyword word must not be blank." }
        require(rank > 0) { "Scored trend keyword rank must be positive." }
        require(trendScore >= 0) { "Scored trend keyword score must not be negative." }
        require(averageRatio >= 0.0) { "Scored trend keyword average ratio must not be negative." }
        require(maxRatio >= 0.0) { "Scored trend keyword max ratio must not be negative." }
        require(candidateScore >= 0) { "Scored trend keyword candidate score must not be negative." }
    }
}
