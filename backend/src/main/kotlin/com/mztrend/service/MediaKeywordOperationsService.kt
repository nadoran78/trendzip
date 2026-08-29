package com.mztrend.service

import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.controller.ops.dto.MediaEvidenceVideoResponse
import com.mztrend.controller.ops.dto.MediaKeywordDetailResponse
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.query.KeywordQueryRepository
import com.mztrend.repository.query.dto.FeedVideoQueryResult
import com.mztrend.repository.query.dto.KeywordExplainQueryResult
import com.mztrend.service.mapper.toKeywordSummaryResponse
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class MediaKeywordOperationsService(
    private val keywordQueryRepository: KeywordQueryRepository,
) {
    fun getKeywordDetail(id: Long): MediaKeywordDetailResponse {
        val keyword =
            keywordQueryRepository.findExplainById(id)
                ?: throw MzTrendException(ErrorCode.NOT_FOUND)
        val relatedVideos =
            keywordQueryRepository
                .findRelatedVideos(keyword.id, keyword.word)
                .map { it.toMediaEvidenceVideoResponse() }
        val relatedKeywords =
            keywordQueryRepository
                .findRelatedKeywords(keyword.id, keyword.generation)
                .map { it.toKeywordSummaryResponse() }

        return keyword.toMediaKeywordDetailResponse(relatedVideos, relatedKeywords)
    }
}

private fun KeywordExplainQueryResult.toMediaKeywordDetailResponse(
    relatedVideos: List<MediaEvidenceVideoResponse>,
    relatedKeywords: List<KeywordSummaryResponse>,
): MediaKeywordDetailResponse =
    MediaKeywordDetailResponse(
        keywordId = id,
        keyword = word,
        generation = generation,
        category = category,
        rank = rank,
        trendScore = trendScore,
        rankTrend = rankTrend,
        rankDelta = rankDelta,
        explain = explain,
        sourceCrawlRunId = sourceCrawlRunId,
        snapshotAt = snapshotAt,
        explainedAt = explainedAt,
        relatedVideos = relatedVideos,
        relatedKeywords = relatedKeywords,
    )

private fun FeedVideoQueryResult.toMediaEvidenceVideoResponse(): MediaEvidenceVideoResponse =
    MediaEvidenceVideoResponse(
        videoId = videoId,
        title = title,
        channelId = channelId,
        channelName = channelName,
        description = description,
        tags = tags,
        thumbnailUrl = thumbnailUrl,
        viewCount = viewCount,
        feedSection = feedSection,
        badge = badge,
        publishedAt = publishedAt,
        durationSeconds = durationSeconds,
    )
