package com.mztrend.service.crawling.candidate

import java.time.LocalDateTime

data class TrendCandidate(
    val word: String,
    val category: String? = null,
    val source: TrendCandidateSourceType,
    val rank: Int,
    val score: Long,
    val evidenceCount: Int,
    val totalViewCount: Long,
    val collectedAt: LocalDateTime,
    val evidenceVideos: List<TrendCandidateEvidenceVideo> = emptyList(),
) {
    init {
        require(word.isNotBlank()) { "Trend candidate word must not be blank." }
        require(rank > 0) { "Trend candidate rank must be positive." }
        require(score >= 0) { "Trend candidate score must not be negative." }
        require(evidenceCount > 0) { "Trend candidate evidence count must be positive." }
        require(totalViewCount >= 0) { "Trend candidate total view count must not be negative." }
    }
}

data class TrendCandidateEvidenceVideo(
    val videoId: String,
    val title: String,
    val channelName: String,
    val tags: List<String> = emptyList(),
    val description: String? = null,
    val viewCount: Long? = null,
) {
    init {
        require(videoId.isNotBlank()) { "Trend candidate evidence video id must not be blank." }
        require(title.isNotBlank()) { "Trend candidate evidence video title must not be blank." }
        require(channelName.isNotBlank()) { "Trend candidate evidence video channel name must not be blank." }
    }
}

enum class TrendCandidateSourceType {
    YOUTUBE_POPULAR,
}
