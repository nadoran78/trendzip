package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.KeywordListResponse
import com.mztrend.domain.Generation
import com.mztrend.repository.query.KeywordQueryRepository
import com.mztrend.service.mapper.toKeywordSummaryResponse
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
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
                    .map { it.toKeywordSummaryResponse() },
        )
}
