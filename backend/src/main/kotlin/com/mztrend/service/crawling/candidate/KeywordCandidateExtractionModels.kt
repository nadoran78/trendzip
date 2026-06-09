package com.mztrend.service.crawling.candidate

import java.time.LocalDateTime

data class KeywordCandidateExtractionRequest(
    val videos: List<KeywordCandidateExtractionVideo>,
    val collectedAt: LocalDateTime,
)

data class KeywordCandidateExtractionVideo(
    val videoId: String,
    val title: String,
    val channelName: String,
    val tags: List<String> = emptyList(),
    val description: String? = null,
    val viewCount: Long? = null,
    val publishedAt: LocalDateTime? = null,
) {
    init {
        require(videoId.isNotBlank()) { "Keyword candidate extraction video id must not be blank." }
        require(title.isNotBlank()) { "Keyword candidate extraction video title must not be blank." }
        require(channelName.isNotBlank()) { "Keyword candidate extraction video channel name must not be blank." }
    }
}

data class KeywordCandidateExtractionResult(
    val candidates: List<ExtractedKeywordCandidate> = emptyList(),
)

data class ExtractedKeywordCandidate(
    val keyword: String = "",
    val category: String? = null,
    val confidence: Double = 0.0,
    val evidenceVideoIds: List<String> = emptyList(),
    val reason: String? = null,
)
