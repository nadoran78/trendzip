package com.mztrend.client.dto

import java.time.LocalDateTime

data class YoutubeSearchVideo(
    val videoId: String,
    val title: String,
    val channelId: String,
    val channelName: String,
    val thumbnailUrl: String?,
    val publishedAt: LocalDateTime?,
)

data class YoutubeVideoDetail(
    val videoId: String,
    val title: String,
    val channelId: String?,
    val channelName: String,
    val thumbnailUrl: String?,
    val viewCount: Long?,
    val publishedAt: LocalDateTime?,
    val durationSeconds: Int?,
    val categoryId: String?,
)

data class YoutubeChannelDetail(
    val channelId: String,
    val title: String,
    val subscriberCount: Long?,
    val primaryTopicCategory: String?,
)
