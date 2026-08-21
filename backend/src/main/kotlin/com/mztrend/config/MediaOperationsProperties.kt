package com.mztrend.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.media-operations")
data class MediaOperationsProperties(
    val apiKey: String = "",
)
