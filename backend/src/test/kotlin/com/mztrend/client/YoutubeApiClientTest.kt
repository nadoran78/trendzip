package com.mztrend.client

import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod.GET
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestTemplate
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class YoutubeApiClientTest {
    private lateinit var server: MockRestServiceServer
    private lateinit var client: YoutubeApiClient

    @BeforeEach
    fun setUp() {
        val restTemplate = RestTemplate()
        server = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build()
        client = YoutubeApiClient(testProperties(), restTemplate)
    }

    @Test
    fun `searchVideos parses video search response`() {
        server
            .expect(requestTo(containsString("/search")))
            .andExpect(method(GET))
            .andExpect(queryParam("key", TEST_API_KEY))
            .andExpect(queryParam("part", "snippet"))
            .andExpect(queryParam("type", "video"))
            .andExpect(queryParam("q", "아이브"))
            .andExpect(queryParam("maxResults", "2"))
            .andExpect(queryParam("regionCode", "KR"))
            .andExpect(queryParam("relevanceLanguage", "ko"))
            .andExpect(queryParam("safeSearch", "moderate"))
            .andRespond(withSuccess(searchResponse(), MediaType.APPLICATION_JSON))

        val videos = client.searchVideos(" 아이브 ", Generation.TEEN, maxResults = 2)

        assertEquals(1, videos.size)
        assertEquals("video-1", videos[0].videoId)
        assertEquals("영상 제목", videos[0].title)
        assertEquals("channel-1", videos[0].channelId)
        assertEquals("채널명", videos[0].channelName)
        assertEquals("https://img.example/high.jpg", videos[0].thumbnailUrl)
        assertEquals(LocalDateTime.of(2026, 5, 20, 19, 15), videos[0].publishedAt)
        server.verify()
    }

    @Test
    fun `getVideoDetails parses details and converts duration to seconds`() {
        server
            .expect(requestTo(containsString("/videos")))
            .andExpect(method(GET))
            .andExpect(queryParam("key", TEST_API_KEY))
            .andExpect(queryParam("part", "snippet,statistics,contentDetails"))
            .andExpect(queryParam("id", "video-1,video-2"))
            .andRespond(withSuccess(videoDetailResponse(), MediaType.APPLICATION_JSON))

        val videos = client.getVideoDetails(listOf("video-1", "video-2", "video-1"))

        assertEquals(1, videos.size)
        assertEquals("video-1", videos[0].videoId)
        assertEquals("상세 영상", videos[0].title)
        assertEquals("channel-1", videos[0].channelId)
        assertEquals("상세 채널", videos[0].channelName)
        assertEquals("https://img.example/max.jpg", videos[0].thumbnailUrl)
        assertEquals(123_456L, videos[0].viewCount)
        assertEquals(LocalDateTime.of(2026, 5, 19, 18, 0), videos[0].publishedAt)
        assertEquals(205, videos[0].durationSeconds)
        assertEquals("10", videos[0].categoryId)
        server.verify()
    }

    @Test
    fun `getChannelDetails parses subscriber count and topic category`() {
        server
            .expect(requestTo(containsString("/channels")))
            .andExpect(method(GET))
            .andExpect(queryParam("key", TEST_API_KEY))
            .andExpect(queryParam("part", "snippet,statistics,topicDetails"))
            .andExpect(queryParam("id", "channel-1,channel-hidden"))
            .andRespond(withSuccess(channelDetailResponse(), MediaType.APPLICATION_JSON))

        val channels = client.getChannelDetails(listOf("channel-1", "channel-hidden"))

        assertEquals(2, channels.size)
        assertEquals("channel-1", channels[0].channelId)
        assertEquals("상세 채널", channels[0].title)
        assertEquals(1_000_000L, channels[0].subscriberCount)
        assertEquals("Music", channels[0].primaryTopicCategory)
        assertEquals("channel-hidden", channels[1].channelId)
        assertNull(channels[1].subscriberCount)
        server.verify()
    }

    @Test
    fun `toCollectedVideo merges video and channel details`() {
        server
            .expect(requestTo(containsString("/videos")))
            .andExpect(queryParam("id", "video-1"))
            .andRespond(withSuccess(videoDetailResponse(), MediaType.APPLICATION_JSON))
        server
            .expect(requestTo(containsString("/channels")))
            .andExpect(queryParam("id", "channel-1"))
            .andRespond(withSuccess(channelDetailResponse(singleChannelOnly = true), MediaType.APPLICATION_JSON))

        val video = client.getVideoDetails(listOf("video-1")).single()
        val channel = client.getChannelDetails(listOf("channel-1")).single()
        val collectedAt = LocalDateTime.of(2026, 5, 21, 11, 30)

        val collectedVideo = video.toCollectedVideo(channel, collectedAt)

        assertEquals("video-1", collectedVideo.youtubeVideoId)
        assertEquals("상세 영상", collectedVideo.title)
        assertEquals("channel-1", collectedVideo.channelId)
        assertEquals("상세 채널", collectedVideo.channelName)
        assertEquals("Music", collectedVideo.channelCategory)
        assertEquals(1_000_000L, collectedVideo.channelSubscriberCount)
        assertEquals("https://img.example/max.jpg", collectedVideo.thumbnailUrl)
        assertEquals(123_456L, collectedVideo.viewCount)
        assertEquals(205, collectedVideo.durationSeconds)
        assertEquals(collectedAt, collectedVideo.collectedAt)
        server.verify()
    }

    @Test
    fun `client throws clear exception when api key is missing`() {
        val clientWithoutApiKey =
            YoutubeApiClient(
                testProperties(apiKey = ""),
                RestTemplate(),
            )

        val exception =
            assertFailsWith<YoutubeApiException> {
                clientWithoutApiKey.searchVideos("아이브", Generation.TEEN)
            }

        assertEquals("YouTube API key is not configured.", exception.message)
    }

    @Test
    fun `client throws clear exception when youtube returns error`() {
        server
            .expect(requestTo(containsString("/search")))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS))

        val exception =
            assertFailsWith<YoutubeApiException> {
                client.searchVideos("아이브", Generation.TEEN)
            }

        assertEquals("YouTube API request failed. status=429", exception.message)
        server.verify()
    }

    private fun testProperties(apiKey: String = TEST_API_KEY): ExternalApiProperties =
        ExternalApiProperties(
            youtube =
                ExternalApiProperties.Youtube(
                    baseUrl = "https://www.googleapis.com/youtube/v3",
                    apiKey = apiKey,
                ),
        )

    private fun searchResponse(): String =
        """
        {
          "items": [
            {
              "id": { "videoId": "video-1" },
              "snippet": {
                "title": "영상 제목",
                "channelId": "channel-1",
                "channelTitle": "채널명",
                "publishedAt": "2026-05-20T10:15:00Z",
                "thumbnails": {
                  "default": { "url": "https://img.example/default.jpg" },
                  "high": { "url": "https://img.example/high.jpg" }
                }
              }
            },
            {
              "id": {},
              "snippet": {
                "title": "video id가 없어 무시되는 영상",
                "channelId": "channel-2",
                "channelTitle": "채널명"
              }
            }
          ]
        }
        """.trimIndent()

    private fun videoDetailResponse(): String =
        """
        {
          "items": [
            {
              "id": "video-1",
              "snippet": {
                "title": "상세 영상",
                "channelId": "channel-1",
                "channelTitle": "상세 채널",
                "publishedAt": "2026-05-19T09:00:00Z",
                "categoryId": "10",
                "thumbnails": {
                  "medium": { "url": "https://img.example/medium.jpg" },
                  "maxres": { "url": "https://img.example/max.jpg" }
                }
              },
              "statistics": {
                "viewCount": "123456"
              },
              "contentDetails": {
                "duration": "PT3M25S"
              }
            },
            {
              "id": "video-without-title",
              "snippet": {
                "channelId": "channel-2",
                "channelTitle": "제목 없음 채널"
              }
            }
          ]
        }
        """.trimIndent()

    private fun channelDetailResponse(singleChannelOnly: Boolean = false): String =
        if (singleChannelOnly) {
            singleChannelDetailResponse()
        } else {
            multipleChannelDetailResponse()
        }

    private fun singleChannelDetailResponse(): String =
        """
        {
          "items": [
            {
              "id": "channel-1",
              "snippet": { "title": "상세 채널" },
              "statistics": {
                "subscriberCount": "1000000",
                "hiddenSubscriberCount": false
              },
              "topicDetails": {
                "topicCategories": [
                  "https://en.wikipedia.org/wiki/Music"
                ]
              }
            }
          ]
        }
        """.trimIndent()

    private fun multipleChannelDetailResponse(): String =
        """
        {
          "items": [
            {
              "id": "channel-1",
              "snippet": { "title": "상세 채널" },
              "statistics": {
                "subscriberCount": "1000000",
                "hiddenSubscriberCount": false
              },
              "topicDetails": {
                "topicCategories": [
                  "https://en.wikipedia.org/wiki/Music"
                ]
              }
            },
            {
              "id": "channel-hidden",
              "snippet": { "title": "구독자 숨김 채널" },
              "statistics": {
                "hiddenSubscriberCount": true
              }
            }
          ]
        }
        """.trimIndent()

    companion object {
        private const val TEST_API_KEY = "test-youtube-api-key"
    }
}
