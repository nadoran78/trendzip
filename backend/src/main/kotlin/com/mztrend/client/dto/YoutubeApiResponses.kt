package com.mztrend.client.dto

internal data class YoutubeSearchResponse(
    val items: List<YoutubeSearchItem> = emptyList(),
)

internal data class YoutubeSearchItem(
    val id: YoutubeSearchId? = null,
    val snippet: YoutubeSnippet? = null,
)

internal data class YoutubeSearchId(
    val videoId: String? = null,
)

internal data class YoutubeVideoListResponse(
    val items: List<YoutubeVideoItem> = emptyList(),
)

internal data class YoutubeVideoItem(
    val id: String? = null,
    val snippet: YoutubeSnippet? = null,
    val statistics: YoutubeVideoStatistics? = null,
    val contentDetails: YoutubeContentDetails? = null,
)

internal data class YoutubeChannelListResponse(
    val items: List<YoutubeChannelItem> = emptyList(),
)

internal data class YoutubeChannelItem(
    val id: String? = null,
    val snippet: YoutubeChannelSnippet? = null,
    val statistics: YoutubeChannelStatistics? = null,
    val topicDetails: YoutubeTopicDetails? = null,
)

internal data class YoutubeSnippet(
    val title: String? = null,
    val channelId: String? = null,
    val channelTitle: String? = null,
    val publishedAt: String? = null,
    val thumbnails: YoutubeThumbnails? = null,
    val categoryId: String? = null,
)

internal data class YoutubeChannelSnippet(
    val title: String? = null,
)

internal data class YoutubeThumbnails(
    val `default`: YoutubeThumbnail? = null,
    val medium: YoutubeThumbnail? = null,
    val high: YoutubeThumbnail? = null,
    val standard: YoutubeThumbnail? = null,
    val maxres: YoutubeThumbnail? = null,
) {
    fun bestUrl(): String? =
        maxres?.url
            ?: standard?.url
            ?: high?.url
            ?: medium?.url
            ?: `default`?.url
}

internal data class YoutubeThumbnail(
    val url: String? = null,
)

internal data class YoutubeVideoStatistics(
    val viewCount: String? = null,
)

internal data class YoutubeChannelStatistics(
    val subscriberCount: String? = null,
    val hiddenSubscriberCount: Boolean? = null,
)

internal data class YoutubeContentDetails(
    val duration: String? = null,
)

internal data class YoutubeTopicDetails(
    val topicCategories: List<String> = emptyList(),
)
