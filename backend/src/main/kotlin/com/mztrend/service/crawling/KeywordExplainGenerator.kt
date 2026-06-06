package com.mztrend.service.crawling

interface KeywordExplainGenerator {
    fun generate(request: KeywordExplainRequest): String
}
