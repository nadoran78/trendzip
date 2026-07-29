package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.controller.dto.FeedVideoResponse
import com.mztrend.controller.dto.KeywordExplainResponse
import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.controller.dto.TrendGraphPointResponse
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.query.KeywordQueryRepository
import com.mztrend.repository.query.dto.KeywordExplainQueryResult
import com.mztrend.repository.query.dto.TrendGraphPointQueryResult
import com.mztrend.service.mapper.toFeedVideoResponse
import com.mztrend.service.mapper.toKeywordSummaryResponse
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class KeywordExplainService(
    private val keywordQueryRepository: KeywordQueryRepository,
) {
    @Cacheable(cacheNames = [CacheNames.KEYWORDS], key = "'explain:v2:' + #id")
    fun getKeywordExplain(id: Long): KeywordExplainResponse {
        val keyword =
            keywordQueryRepository.findExplainById(id)
                ?: throw MzTrendException(ErrorCode.NOT_FOUND)

        val relatedVideos =
            keywordQueryRepository
                .findRelatedVideos(keyword.id, keyword.word)
                .map { it.toFeedVideoResponse() }
        val trendGraph =
            keywordQueryRepository
                .findTrendGraph(keyword.id)
                .map { it.toTrendGraphPointResponse() }
        val relatedKeywords =
            keywordQueryRepository
                .findRelatedKeywords(keyword.id, keyword.generation)
                .map { it.toKeywordSummaryResponse() }

        return keyword.toKeywordExplainResponse(
            relatedVideos = relatedVideos,
            trendGraph = trendGraph,
            relatedKeywords = relatedKeywords,
        )
    }
}

private fun KeywordExplainQueryResult.toKeywordExplainResponse(
    relatedVideos: List<FeedVideoResponse>,
    trendGraph: List<TrendGraphPointResponse>,
    relatedKeywords: List<KeywordSummaryResponse>,
): KeywordExplainResponse =
    KeywordExplainResponse(
        keywordId = id,
        keyword = word,
        generation = generation,
        category = category,
        rank = rank,
        trendScore = trendScore,
        rankTrend = rankTrend,
        rankDelta = rankDelta,
        explain = explain,
        relatedVideos = relatedVideos,
        trendGraph = trendGraph,
        relatedKeywords = relatedKeywords,
    )

private fun TrendGraphPointQueryResult.toTrendGraphPointResponse(): TrendGraphPointResponse =
    TrendGraphPointResponse(
        period = period,
        ratio = ratio,
    )
