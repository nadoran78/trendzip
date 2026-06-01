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
}
