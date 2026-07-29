package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.FeedResponse
import com.mztrend.domain.Generation
import com.mztrend.repository.query.FeedQueryRepository
import com.mztrend.service.mapper.toFeedVideoResponse
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class FeedService(
    private val feedQueryRepository: FeedQueryRepository,
) {
    @Cacheable(cacheNames = [CacheNames.FEED], key = "#generation.name")
    fun getFeed(generation: Generation): FeedResponse =
        FeedResponse(
            generation = generation,
            videos =
                feedQueryRepository
                    .findByGeneration(generation)
                    .map { it.toFeedVideoResponse() },
        )
}
