package com.mztrend.service.crawling.candidate

interface KeywordCandidateExtractor {
    fun extract(request: KeywordCandidateExtractionRequest): KeywordCandidateExtractionResult
}
