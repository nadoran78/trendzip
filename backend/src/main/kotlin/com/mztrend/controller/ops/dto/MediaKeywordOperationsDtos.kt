package com.mztrend.controller.ops.dto

import com.mztrend.controller.dto.KeywordSummaryResponse
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import java.time.LocalDateTime

data class MediaKeywordDetailResponse(
    val keywordId: Long,
    val keyword: String,
    val generation: Generation,
    val category: String?,
    val rank: Int?,
    val trendScore: Long?,
    val rankTrend: RankTrend?,
    val rankDelta: Int?,
    val explain: String?,
    val sourceCrawlRunId: Long?,
    val snapshotAt: LocalDateTime?,
    val explainedAt: LocalDateTime?,
    val relatedVideos: List<MediaEvidenceVideoResponse>,
    val relatedKeywords: List<KeywordSummaryResponse>,
)

data class MediaEvidenceVideoResponse(
    val videoId: String,
    val title: String,
    val channelId: String?,
    val channelName: String,
    val description: String?,
    val tags: List<String>,
    val thumbnailUrl: String?,
    val viewCount: Long?,
    val feedSection: FeedSection?,
    val badge: String?,
    val publishedAt: LocalDateTime?,
    val durationSeconds: Int?,
)
