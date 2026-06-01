package com.mztrend.service.crawling.candidate

interface TrendCandidateSource {
    fun collectCandidates(): List<TrendCandidate>
}
