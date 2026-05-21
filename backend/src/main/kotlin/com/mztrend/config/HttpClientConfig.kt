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
}
