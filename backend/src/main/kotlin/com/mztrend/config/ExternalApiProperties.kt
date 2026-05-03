package com.mztrend.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "external")
data class ExternalApiProperties(
    val youtube: Youtube = Youtube(),
    val naver: Naver = Naver(),
    val gemini: Gemini = Gemini(),
) {
    data class Youtube(
        val apiKey: String = "",
    )

    data class Naver(
        val clientId: String = "",
        val clientSecret: String = "",
    )

    data class Gemini(
        val apiKey: String = "",
    )
}
