package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.FeedResponse
import com.mztrend.controller.dto.FeedVideoResponse
import com.mztrend.domain.Generation
import com.mztrend.repository.query.FeedQueryRepository
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

@Service
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
                    .map {
                        FeedVideoResponse(
                            videoId = it.videoId,
                            title = it.title,
                            channelName = it.channelName,
                            thumbnailUrl = it.thumbnailUrl,
                            viewCount = it.viewCount,
                            keyword = it.keyword,
                            feedSection = it.feedSection,
                            badge = it.badge,
                            publishedAt = it.publishedAt,
                            durationSeconds = it.durationSeconds,
                        )
                    },
        )
}
