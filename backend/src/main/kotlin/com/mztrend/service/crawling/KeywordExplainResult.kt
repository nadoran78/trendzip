package com.mztrend.service.crawling

import java.time.LocalDateTime

data class KeywordExplainResult(
    val word: String,
    val explain: String,
    val explainedAt: LocalDateTime,
) {
    init {
        require(word.isNotBlank()) { "Keyword explain word must not be blank." }
        require(explain.isNotBlank()) { "Keyword explain must not be blank." }
    }
}
