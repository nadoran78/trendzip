package com.mztrend.client

import com.mztrend.client.dto.YoutubeChannelDetail
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.service.crawling.CollectedVideo
import java.time.LocalDateTime

fun YoutubeVideoDetail.toCollectedVideo(
    channelDetail: YoutubeChannelDetail? = null,
    collectedAt: LocalDateTime = LocalDateTime.now(),
): CollectedVideo =
    CollectedVideo(
        youtubeVideoId = videoId,
        title = title,
        channelId = channelId ?: channelDetail?.channelId,
        channelName = channelDetail?.title ?: channelName,
        channelCategory = channelDetail?.primaryTopicCategory,
        channelSubscriberCount = channelDetail?.subscriberCount,
        thumbnailUrl = thumbnailUrl,
        viewCount = viewCount,
        publishedAt = publishedAt,
        durationSeconds = durationSeconds,
        collectedAt = collectedAt,
    )
