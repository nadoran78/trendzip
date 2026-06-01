package com.mztrend.service.crawling.candidate

import java.time.LocalDateTime

data class TrendCandidate(
    val word: String,
    val source: TrendCandidateSourceType,
    val rank: Int,
    val score: Long,
    val evidenceCount: Int,
    val totalViewCount: Long,
    val collectedAt: LocalDateTime,
) {
    init {
        require(word.isNotBlank()) { "Trend candidate word must not be blank." }
        require(rank > 0) { "Trend candidate rank must be positive." }
        require(score >= 0) { "Trend candidate score must not be negative." }
        require(evidenceCount > 0) { "Trend candidate evidence count must be positive." }
        require(totalViewCount >= 0) { "Trend candidate total view count must not be negative." }
    }
}

enum class TrendCandidateSourceType {
    YOUTUBE_POPULAR,
}
