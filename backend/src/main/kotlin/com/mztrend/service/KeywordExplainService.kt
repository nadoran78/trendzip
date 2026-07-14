package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.FeedVideoResponse
import com.mztrend.controller.dto.KeywordExplainResponse
import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.controller.dto.TrendGraphPointResponse
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.query.KeywordQueryRepository
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

@Service
class KeywordExplainService(
    private val keywordQueryRepository: KeywordQueryRepository,
) {
    @Cacheable(cacheNames = [CacheNames.KEYWORDS], key = "'explain:' + #id")
    fun getKeywordExplain(id: Long): KeywordExplainResponse {
        val keyword =
            keywordQueryRepository.findExplainById(id)
                ?: throw MzTrendException(ErrorCode.NOT_FOUND)

        return KeywordExplainResponse(
            keyword = keyword.word,
            explain = keyword.explain,
            relatedVideos =
                keywordQueryRepository.findRelatedVideos(keyword.id, keyword.word).map {
                    FeedVideoResponse(
                        videoId = it.videoId,
                        keywordId = it.keywordId,
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
            trendGraph =
                keywordQueryRepository.findTrendGraph(keyword.id).map {
                    TrendGraphPointResponse(
                        period = it.period,
                        ratio = it.ratio,
                    )
                },
            relatedKeywords =
                keywordQueryRepository.findRelatedKeywords(keyword.id, keyword.generation).map {
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
}
