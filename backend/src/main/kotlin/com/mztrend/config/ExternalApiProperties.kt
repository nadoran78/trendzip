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
    )

    data class Naver(
        val clientId: String = "",
        val clientSecret: String = "",
    )

    data class Gemini(
        val apiKey: String = "",
    )
}
