package com.mztrend.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate
import java.time.Duration

@Configuration
class HttpClientConfig {
    @Bean
    fun youtubeRestTemplate(
        restTemplateBuilder: RestTemplateBuilder,
        properties: ExternalApiProperties,
    ): RestTemplate {
        val youtube = properties.youtube
        require(youtube.connectTimeoutSeconds > 0) { "YouTube connect timeout must be positive." }
        require(youtube.readTimeoutSeconds > 0) { "YouTube read timeout must be positive." }
        require(youtube.keywordSearchMaxKeywords > 0) { "YouTube keyword search max keywords must be positive." }
        require(youtube.keywordSearchMaxResults in 1..50) { "YouTube keyword search max results must be between 1 and 50." }

        return restTemplateBuilder
            .connectTimeout(Duration.ofSeconds(youtube.connectTimeoutSeconds))
            .readTimeout(Duration.ofSeconds(youtube.readTimeoutSeconds))
            .build()
    }

    @Bean
    fun naverRestTemplate(
        restTemplateBuilder: RestTemplateBuilder,
        properties: ExternalApiProperties,
    ): RestTemplate {
        val naver = properties.naver
        require(naver.connectTimeoutSeconds > 0) { "Naver connect timeout must be positive." }
        require(naver.readTimeoutSeconds > 0) { "Naver read timeout must be positive." }
        require(naver.trendPeriodDays > 0) { "Naver trend period days must be positive." }
        require(naver.maxKeywordGroupSize in 1..5) { "Naver max keyword group size must be between 1 and 5." }
        require(naver.maxCandidateCount > 0) { "Naver max candidate count must be positive." }
        require(naver.minSearchRatio >= 0.0) { "Naver min search ratio must not be negative." }

        return restTemplateBuilder
            .connectTimeout(Duration.ofSeconds(naver.connectTimeoutSeconds))
            .readTimeout(Duration.ofSeconds(naver.readTimeoutSeconds))
            .build()
    }

    @Bean
    fun geminiRestTemplate(
        restTemplateBuilder: RestTemplateBuilder,
        properties: ExternalApiProperties,
    ): RestTemplate {
        val gemini = properties.gemini
        require(gemini.baseUrl.isNotBlank()) { "Gemini base URL must not be blank." }
        require(gemini.model.isNotBlank()) { "Gemini model must not be blank." }
        require(gemini.connectTimeoutSeconds > 0) { "Gemini connect timeout must be positive." }
        require(gemini.readTimeoutSeconds > 0) { "Gemini read timeout must be positive." }
        require(gemini.maxExplainKeywordCount > 0) { "Gemini max explain keyword count must be positive." }
        require(gemini.maxPromptVideoCount >= 0) { "Gemini max prompt video count must not be negative." }
        require(gemini.rankSurgeThreshold > 0) { "Gemini rank surge threshold must be positive." }
        require(gemini.longRunningWeeks > 1) { "Gemini long running weeks must be greater than 1." }
        require(gemini.maxOutputTokens > 0) { "Gemini max output tokens must be positive." }
        require(gemini.temperature in 0.0..2.0) { "Gemini temperature must be between 0.0 and 2.0." }

        return restTemplateBuilder
            .connectTimeout(Duration.ofSeconds(gemini.connectTimeoutSeconds))
            .readTimeout(Duration.ofSeconds(gemini.readTimeoutSeconds))
            .build()
    }
}
