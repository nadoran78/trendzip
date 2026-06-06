package com.mztrend.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.crawling-scheduler")
data class CrawlingSchedulerProperties(
    val enabled: Boolean = true,
    val cron: String = "0 0 3 * * MON",
    val zone: String = "Asia/Seoul",
    val runOnStartup: Boolean = false,
)
