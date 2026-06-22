package com.mztrend.service.crawling

import com.mztrend.client.YoutubeApiClient
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import com.mztrend.service.crawling.candidate.TrendCandidateSourceType
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod.GET
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestTemplate
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class YoutubeKeywordVideoCollectorTest {
    private lateinit var server: MockRestServiceServer
    private lateinit var collector: YoutubeKeywordVideoCollector

    @BeforeEach
    fun setUp() {
        val restTemplate = RestTemplate()
        val properties = testProperties()
        server = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build()
        collector =
            YoutubeKeywordVideoCollector(
                youtubeApiClient = YoutubeApiClient(properties, restTemplate),
                properties = properties,
                clock = Clock.fixed(Instant.parse("2026-05-31T18:00:00Z"), ZoneId.of("Asia/Seoul")),
                feedCurationPolicy = DefaultFeedCurationPolicy(),
            )
    }

    @Test
    fun `collect searches videos by keyword and builds deduplicated feed items`() {
        expectSearch(keyword = "아이브", response = searchResponse("video-1", "video-2"))
        expectSearch(keyword = "마라탕후루", response = searchResponse("video-1", "video-3"))
        expectVideoDetails()
        expectChannelDetails()

        val batch =
            collector.collect(
                generation = Generation.TEEN,
                scoredKeywords =
                    listOf(
                        scoredKeyword("아이브", rank = 1, trendScore = 120_000L),
                        scoredKeyword("마라탕후루", rank = 2, trendScore = 90_000L),
                    ),
            )

        assertContentEquals(listOf("video-1", "video-2", "video-3"), batch.videos.map { it.youtubeVideoId })
        assertContentEquals(listOf("상세 채널 1", "상세 채널 2", "상세 채널 3"), batch.videos.map { it.channelName })

        assertContentEquals(listOf("video-1", "video-3", "video-2"), batch.feedItems.map { it.youtubeVideoId })
        assertContentEquals(listOf("아이브", "마라탕후루", "아이브"), batch.feedItems.map { it.keywordWord })
        assertContentEquals(listOf(FeedSection.TODAY_PICK, FeedSection.RISING, FeedSection.RISING), batch.feedItems.map { it.feedSection })
        assertContentEquals(listOf(1, 1, 2), batch.feedItems.map { it.displayOrder })
        assertContentEquals(listOf("HOT", "NEW", "NEW"), batch.feedItems.map { it.badge })
        assertEquals(LocalDateTime.of(2026, 6, 1, 3, 0), batch.feedItems.single { it.youtubeVideoId == "video-1" }.collectedAt)

        assertEquals(4, batch.videoKeywords.size)
        val video1Keywords = batch.videoKeywords.filter { it.youtubeVideoId == "video-1" }
        assertContentEquals(listOf("아이브", "마라탕후루"), video1Keywords.map { it.keywordWord })
        assertEquals(TrendVideoKeywordRelationType.RELATED, video1Keywords.first().relationType)
        server.verify()
    }

    @Test
    fun `collect ignores scored keywords from other generation`() {
        val batch =
            collector.collect(
                generation = Generation.TEEN,
                scoredKeywords = listOf(scoredKeyword("퇴근 후 루틴", generation = Generation.TWENTY)),
            )

        assertEquals(0, batch.videos.size)
        assertEquals(0, batch.feedItems.size)
        assertEquals(0, batch.videoKeywords.size)
    }

    private fun expectSearch(
        keyword: String,
        response: String,
    ) {
        server
            .expect(requestTo(containsString("/search")))
            .andExpect(method(GET))
            .andExpect(queryParam("q", keyword))
            .andExpect(queryParam("maxResults", "2"))
            .andRespond(withSuccess(response, MediaType.APPLICATION_JSON))
    }

    private fun expectVideoDetails() {
        server
            .expect(requestTo(containsString("/videos")))
            .andExpect(method(GET))
            .andExpect(queryParam("id", "video-1,video-2,video-3"))
            .andRespond(withSuccess(videoDetailResponse(), MediaType.APPLICATION_JSON))
    }

    private fun expectChannelDetails() {
        server
            .expect(requestTo(containsString("/channels")))
            .andExpect(method(GET))
            .andExpect(queryParam("id", "channel-1,channel-2,channel-3"))
            .andRespond(withSuccess(channelDetailResponse(), MediaType.APPLICATION_JSON))
    }

    private fun testProperties(): ExternalApiProperties =
        ExternalApiProperties(
            youtube =
                ExternalApiProperties.Youtube(
                    apiKey = "test-youtube-api-key",
                    keywordSearchMaxKeywords = 2,
                    keywordSearchMaxResults = 2,
                ),
        )

    private fun scoredKeyword(
        word: String,
        generation: Generation = Generation.TEEN,
        rank: Int = 1,
        trendScore: Long = 100_000L,
    ): ScoredTrendKeyword =
        ScoredTrendKeyword(
            generation = generation,
            word = word,
            rank = rank,
            trendScore = trendScore,
            averageRatio = 50.0,
            maxRatio = 100.0,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            candidateScore = 1_000L,
            collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
        )

    private fun searchResponse(
        firstVideoId: String,
        secondVideoId: String,
    ): String =
        """
        {
          "items": [
            {
              "id": { "videoId": "$firstVideoId" },
              "snippet": {
                "title": "검색 영상 $firstVideoId",
                "channelId": "search-channel-1",
                "channelTitle": "검색 채널",
                "publishedAt": "2026-05-31T12:00:00Z"
              }
            },
            {
              "id": { "videoId": "$secondVideoId" },
              "snippet": {
                "title": "검색 영상 $secondVideoId",
                "channelId": "search-channel-2",
                "channelTitle": "검색 채널",
                "publishedAt": "2026-05-31T12:00:00Z"
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
                "title": "상세 영상 1",
                "channelId": "channel-1",
                "channelTitle": "원본 채널 1",
                "publishedAt": "2026-05-31T09:00:00Z"
              },
              "statistics": { "viewCount": "1000000" },
              "contentDetails": { "duration": "PT3M" }
            },
            {
              "id": "video-2",
              "snippet": {
                "title": "상세 영상 2",
                "channelId": "channel-2",
                "channelTitle": "원본 채널 2",
                "publishedAt": "2026-05-30T09:00:00Z"
              },
              "statistics": { "viewCount": "800000" },
              "contentDetails": { "duration": "PT4M" }
            },
            {
              "id": "video-3",
              "snippet": {
                "title": "상세 영상 3",
                "channelId": "channel-3",
                "channelTitle": "원본 채널 3",
                "publishedAt": "2026-05-29T09:00:00Z"
              },
              "statistics": { "viewCount": "700000" },
              "contentDetails": { "duration": "PT5M" }
            }
          ]
        }
        """.trimIndent()

    private fun channelDetailResponse(): String =
        """
        {
          "items": [
            {
              "id": "channel-1",
              "snippet": { "title": "상세 채널 1" },
              "statistics": { "subscriberCount": "1000000", "hiddenSubscriberCount": false },
              "topicDetails": { "topicCategories": ["https://en.wikipedia.org/wiki/Music"] }
            },
            {
              "id": "channel-2",
              "snippet": { "title": "상세 채널 2" },
              "statistics": { "subscriberCount": "800000", "hiddenSubscriberCount": false },
              "topicDetails": { "topicCategories": ["https://en.wikipedia.org/wiki/Entertainment"] }
            },
            {
              "id": "channel-3",
              "snippet": { "title": "상세 채널 3" },
              "statistics": { "subscriberCount": "700000", "hiddenSubscriberCount": false },
              "topicDetails": { "topicCategories": ["https://en.wikipedia.org/wiki/Food"] }
            }
          ]
        }
        """.trimIndent()
}
