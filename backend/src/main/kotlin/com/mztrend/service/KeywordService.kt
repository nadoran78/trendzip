package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.KeywordListResponse
import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.domain.Generation
import com.mztrend.repository.query.KeywordQueryRepository
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

@Service
class KeywordService(
    private val keywordQueryRepository: KeywordQueryRepository,
) {
    @Cacheable(cacheNames = [CacheNames.KEYWORDS], key = "#generation.name")
    fun getKeywords(generation: Generation): KeywordListResponse =
        KeywordListResponse(
            generation = generation,
            keywords =
                keywordQueryRepository
                    .findByGeneration(generation)
                    .map {
                        KeywordSummaryResponse(
                            id = it.id,
                            word = it.word,
                            rank = it.rank,
                            category = it.category,
                            trendScore = it.trendScore,
                            rankTrend = it.rankTrend,
                            rankDelta = it.rankDelta,
                        )
                    },
        )
}
