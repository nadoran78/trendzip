package com.mztrend.service.mapper

import com.mztrend.controller.dto.FeedVideoResponse
import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.repository.query.dto.FeedVideoQueryResult
import com.mztrend.repository.query.dto.KeywordSummaryQueryResult

internal fun FeedVideoQueryResult.toFeedVideoResponse(): FeedVideoResponse =
    FeedVideoResponse(
        videoId = videoId,
        keywordId = keywordId,
        title = title,
        channelName = channelName,
        thumbnailUrl = thumbnailUrl,
        viewCount = viewCount,
        keyword = keyword,
        feedSection = feedSection,
        badge = badge,
        publishedAt = publishedAt,
        durationSeconds = durationSeconds,
    )

internal fun KeywordSummaryQueryResult.toKeywordSummaryResponse(): KeywordSummaryResponse =
    KeywordSummaryResponse(
        id = id,
        word = word,
        rank = rank,
        category = category,
        trendScore = trendScore,
        rankTrend = rankTrend,
        rankDelta = rankDelta,
    )
