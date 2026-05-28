package com.mztrend.controller.dto

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import java.time.LocalDateTime

data class FeedResponse(
    val generation: Generation,
    val videos: List<FeedVideoResponse>,
)

data class FeedVideoResponse(
    val videoId: String,
    val title: String,
    val channelName: String,
    val thumbnailUrl: String?,
    val viewCount: Long?,
    val keyword: String,
    val feedSection: FeedSection?,
    val badge: String?,
    val publishedAt: LocalDateTime?,
    val durationSeconds: Int?,
)
