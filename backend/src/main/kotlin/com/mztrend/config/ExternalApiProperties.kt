package com.mztrend.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "external")
data class ExternalApiProperties(
    val youtube: Youtube = Youtube(),
    val naver: Naver = Naver(),
    val gemini: Gemini = Gemini(),
) {
    data class Youtube(
        val baseUrl: String = "https://www.googleapis.com/youtube/v3",
        val apiKey: String = "",
        val connectTimeoutSeconds: Long = 3,
        val readTimeoutSeconds: Long = 5,
        val regionCode: String = "KR",
        val relevanceLanguage: String = "ko",
        val safeSearch: String = "moderate",
        val popularVideoMaxResults: Int = 50,
        val popularVideoCategoryId: String = "",
        val keywordSearchMaxKeywords: Int = 10,
        val keywordSearchMaxResults: Int = 5,
    )

    data class Naver(
        val baseUrl: String = "https://openapi.naver.com/v1/datalab",
        val clientId: String = "",
        val clientSecret: String = "",
        val connectTimeoutSeconds: Long = 3,
        val readTimeoutSeconds: Long = 5,
        val trendPeriodDays: Long = 30,
        val timeUnit: String = "date",
        val device: String = "mo",
        val maxKeywordGroupSize: Int = 5,
        val maxCandidateCount: Int = 50,
        val minSearchRatio: Double = 1.0,
    )

    data class Gemini(
        val baseUrl: String = "https://generativelanguage.googleapis.com/v1beta",
        val apiKey: String = "",
        val model: String = "gemini-3.1-flash-lite",
        val connectTimeoutSeconds: Long = 3,
        val readTimeoutSeconds: Long = 60,
        val maxExplainKeywordCount: Int = 10,
        val maxPromptVideoCount: Int = 3,
        val rankSurgeThreshold: Int = 3,
        val longRunningWeeks: Int = 4,
        val temperature: Double = 0.3,
        val maxOutputTokens: Int = 1024,
        val thinkingLevel: String = "minimal",
        val rateLimitCooldownSeconds: Long = 60,
        val rateLimitMaxRequestsPerMinute: Int = 20,
        val rateLimitWindowSeconds: Long = 60,
        val rateLimitSafetyDelayMillis: Long = 200,
        val rateLimitRedisKeyPrefix: String = "rate-limit:gemini",
        val explainMinLength: Int = 50,
        val candidateExtractionMaxCandidates: Int = 20,
        val candidateExtractionMinResultCount: Int = 10,
        val candidateExtractionMinConfidence: Double = 0.6,
        val candidateExtractionMaxPromptVideos: Int = 20,
        val candidateExtractionMaxDescriptionLength: Int = 300,
        val candidateExtractionMaxOutputTokens: Int = 4096,
    )
}
