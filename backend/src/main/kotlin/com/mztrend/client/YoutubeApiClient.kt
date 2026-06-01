package com.mztrend.client

import com.mztrend.client.dto.YoutubeChannelDetail
import com.mztrend.client.dto.YoutubeChannelItem
import com.mztrend.client.dto.YoutubeChannelListResponse
import com.mztrend.client.dto.YoutubeSearchItem
import com.mztrend.client.dto.YoutubeSearchResponse
import com.mztrend.client.dto.YoutubeSearchVideo
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.client.dto.YoutubeVideoItem
import com.mztrend.client.dto.YoutubeVideoListResponse
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId

@Component
class YoutubeApiClient(
    private val properties: ExternalApiProperties,
    @param:Qualifier("youtubeRestTemplate")
    private val restTemplate: RestTemplate,
) {
    fun searchVideos(
        keyword: String,
        generation: Generation,
        maxResults: Int = DEFAULT_SEARCH_SIZE,
    ): List<YoutubeSearchVideo> {
        require(keyword.isNotBlank()) { "YouTube search keyword must not be blank." }
        require(maxResults in 1..MAX_SEARCH_SIZE) { "YouTube search maxResults must be between 1 and 50." }

        val response =
            get(
                path = "/search",
                responseType = YoutubeSearchResponse::class.java,
                params =
                    mapOf(
                        "part" to "snippet",
                        "type" to "video",
                        "q" to buildSearchQuery(keyword, generation),
                        "maxResults" to maxResults.toString(),
                        "order" to "relevance",
                        "regionCode" to properties.youtube.regionCode,
                        "relevanceLanguage" to properties.youtube.relevanceLanguage,
                        "safeSearch" to properties.youtube.safeSearch,
                        "videoEmbeddable" to "true",
                    ),
            )

        return response.items.mapNotNull { it.toSearchVideo() }
    }

    fun getPopularVideos(maxResults: Int = properties.youtube.popularVideoMaxResults): List<YoutubeVideoDetail> {
        require(maxResults in 1..MAX_SEARCH_SIZE) { "YouTube popular video maxResults must be between 1 and 50." }

        val params =
            mutableMapOf(
                "part" to "snippet,statistics,contentDetails",
                "chart" to "mostPopular",
                "regionCode" to properties.youtube.regionCode,
                "maxResults" to maxResults.toString(),
            )

        properties.youtube.popularVideoCategoryId
            .takeIf { it.isNotBlank() }
            ?.let { params["videoCategoryId"] = it }

        val response =
            get(
                path = "/videos",
                responseType = YoutubeVideoListResponse::class.java,
                params = params,
            )

        return response.items.mapNotNull { it.toVideoDetail() }
    }

    fun getVideoDetails(videoIds: Collection<String>): List<YoutubeVideoDetail> =
        videoIds
            .filter { it.isNotBlank() }
            .distinct()
            .chunked(MAX_ID_BATCH_SIZE)
            .flatMap { ids ->
                val response =
                    get(
                        path = "/videos",
                        responseType = YoutubeVideoListResponse::class.java,
                        params =
                            mapOf(
                                "part" to "snippet,statistics,contentDetails",
                                "id" to ids.joinToString(","),
                            ),
                    )

                response.items.mapNotNull { it.toVideoDetail() }
            }

    fun getChannelDetails(channelIds: Collection<String>): List<YoutubeChannelDetail> =
        channelIds
            .filter { it.isNotBlank() }
            .distinct()
            .chunked(MAX_ID_BATCH_SIZE)
            .flatMap { ids ->
                val response =
                    get(
                        path = "/channels",
                        responseType = YoutubeChannelListResponse::class.java,
                        params =
                            mapOf(
                                "part" to "snippet,statistics,topicDetails",
                                "id" to ids.joinToString(","),
                            ),
                    )

                response.items.mapNotNull { it.toChannelDetail() }
            }

    private fun <T : Any> get(
        path: String,
        responseType: Class<T>,
        params: Map<String, String>,
    ): T {
        val uriBuilder =
            UriComponentsBuilder
                .fromUriString(properties.youtube.baseUrl.trimEnd('/'))
                .path(path)
                .queryParam("key", requireApiKey())

        params.forEach { (name, value) -> uriBuilder.queryParam(name, value) }

        return try {
            restTemplate.getForObject(uriBuilder.build().toUri(), responseType)
                ?: throw YoutubeApiException("YouTube API returned an empty response.")
        } catch (exception: RestClientResponseException) {
            throw YoutubeApiException("YouTube API request failed. status=${exception.statusCode.value()}")
        } catch (exception: RestClientException) {
            throw YoutubeApiException("YouTube API request failed. message=${exception.message}")
        }
    }

    private fun requireApiKey(): String =
        properties.youtube.apiKey.takeIf { it.isNotBlank() }
            ?: throw YoutubeApiException("YouTube API key is not configured.")

    private fun buildSearchQuery(
        keyword: String,
        generation: Generation,
    ): String =
        when (generation) {
            Generation.TEEN,
            Generation.TWENTY,
            -> keyword.trim()
        }

    private fun YoutubeSearchItem.toSearchVideo(): YoutubeSearchVideo? {
        val videoId = id?.videoId?.takeIf { it.isNotBlank() } ?: return null
        val snippet = snippet ?: return null
        val title = snippet.title?.takeIf { it.isNotBlank() } ?: return null
        val channelId = snippet.channelId?.takeIf { it.isNotBlank() } ?: return null
        val channelName = snippet.channelTitle?.takeIf { it.isNotBlank() } ?: return null

        return YoutubeSearchVideo(
            videoId = videoId,
            title = title,
            channelId = channelId,
            channelName = channelName,
            thumbnailUrl = snippet.thumbnails?.bestUrl(),
            publishedAt = snippet.publishedAt.toLocalDateTimeOrNull(),
        )
    }

    private fun YoutubeVideoItem.toVideoDetail(): YoutubeVideoDetail? {
        val videoId = id?.takeIf { it.isNotBlank() } ?: return null
        val snippet = snippet ?: return null
        val title = snippet.title?.takeIf { it.isNotBlank() } ?: return null
        val channelName = snippet.channelTitle?.takeIf { it.isNotBlank() } ?: return null

        return YoutubeVideoDetail(
            videoId = videoId,
            title = title,
            description = snippet.description?.takeIf { it.isNotBlank() },
            tags = snippet.tags.filter { it.isNotBlank() },
            channelId = snippet.channelId?.takeIf { it.isNotBlank() },
            channelName = channelName,
            thumbnailUrl = snippet.thumbnails?.bestUrl(),
            viewCount = statistics?.viewCount.parseLongOrNull(),
            publishedAt = snippet.publishedAt.toLocalDateTimeOrNull(),
            durationSeconds = contentDetails?.duration.toDurationSecondsOrNull(),
            categoryId = snippet.categoryId?.takeIf { it.isNotBlank() },
        )
    }

    private fun YoutubeChannelItem.toChannelDetail(): YoutubeChannelDetail? {
        val channelId = id?.takeIf { it.isNotBlank() } ?: return null
        val title = snippet?.title?.takeIf { it.isNotBlank() } ?: return null

        return YoutubeChannelDetail(
            channelId = channelId,
            title = title,
            subscriberCount =
                statistics
                    ?.takeUnless { it.hiddenSubscriberCount == true }
                    ?.subscriberCount
                    .parseLongOrNull(),
            primaryTopicCategory = topicDetails?.topicCategories?.firstNotNullOfOrNull { it.toTopicNameOrNull() },
        )
    }

    private fun String?.toLocalDateTimeOrNull(): LocalDateTime? =
        this
            ?.takeIf { it.isNotBlank() }
            ?.let { value ->
                runCatching {
                    OffsetDateTime
                        .parse(value)
                        .atZoneSameInstant(SEOUL_ZONE_ID)
                        .toLocalDateTime()
                }.getOrNull()
            }

    private fun String?.toDurationSecondsOrNull(): Int? =
        this
            ?.takeIf { it.isNotBlank() }
            ?.let { value -> runCatching { Duration.parse(value).seconds.toInt() }.getOrNull() }

    private fun String?.parseLongOrNull(): Long? =
        this
            ?.takeIf { it.isNotBlank() }
            ?.toLongOrNull()

    private fun String.toTopicNameOrNull(): String? {
        val rawTopicName = substringAfterLast('/').takeIf { it.isNotBlank() } ?: return null

        return URLDecoder
            .decode(rawTopicName, StandardCharsets.UTF_8)
            .replace('_', ' ')
    }

    companion object {
        private const val DEFAULT_SEARCH_SIZE = 5
        private const val MAX_SEARCH_SIZE = 50
        private const val MAX_ID_BATCH_SIZE = 50
        private val SEOUL_ZONE_ID = ZoneId.of("Asia/Seoul")
    }
}
