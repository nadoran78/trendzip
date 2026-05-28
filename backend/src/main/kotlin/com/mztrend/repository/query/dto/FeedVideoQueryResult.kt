package com.mztrend.repository.query.dto

import com.mztrend.domain.FeedSection
import java.time.LocalDateTime

data class FeedVideoQueryResult(
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
