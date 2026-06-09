package com.mztrend.service.crawling.candidate

import com.mztrend.client.YoutubeApiClient
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.config.ExternalApiProperties
import org.mockito.Mockito
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class YoutubePopularVideoCandidateSourceTest {
    private val youtubeApiClient = Mockito.mock(YoutubeApiClient::class.java)
    private val keywordCandidateExtractor = RecordingKeywordCandidateExtractor()
    private val source =
        YoutubePopularVideoCandidateSource(
            youtubeApiClient = youtubeApiClient,
            keywordCandidateExtractor = keywordCandidateExtractor,
            fallbackCandidateExtractor = YoutubeVideoCandidateExtractor(),
            properties =
                ExternalApiProperties(
                    youtube = ExternalApiProperties.Youtube(popularVideoMaxResults = 10),
                    gemini =
                        ExternalApiProperties.Gemini(
                            candidateExtractionMaxCandidates = 5,
                            candidateExtractionMinResultCount = 3,
                            candidateExtractionMaxPromptVideos = 1,
                            candidateExtractionMaxDescriptionLength = 4,
                        ),
                ),
            clock = Clock.fixed(Instant.parse("2026-05-31T18:00:00Z"), ZoneId.of("Asia/Seoul")),
        )

    @Test
    fun `collectCandidates uses Gemini candidates without fallback when extracted candidates are enough`() {
        Mockito
            .`when`(youtubeApiClient.getPopularVideos(10))
            .thenReturn(
                listOf(
                    youtubeVideo(
                        videoId = "video-1",
                        title = "다비치 컴백 무대",
                        description = "긴 설명입니다",
                        tags = listOf("다비치", "컴백"),
                        viewCount = 2_000_000L,
                    ),
                    youtubeVideo(
                        videoId = "video-2",
                        title = "아이브 무대",
                        viewCount = 500_000L,
                    ),
                    youtubeVideo(
                        videoId = "video-3",
                        title = "fallbackword 단독 영상",
                        tags = listOf("fallbackword"),
                        viewCount = 100_000L,
                    ),
                ),
            )
        keywordCandidateExtractor.result =
            KeywordCandidateExtractionResult(
                candidates =
                    listOf(
                        extractedCandidate("아이브", confidence = 0.95, evidenceVideoIds = listOf("video-2")),
                        extractedCandidate("다비치", confidence = 0.8, evidenceVideoIds = listOf("video-1")),
                        extractedCandidate("뉴진스", confidence = 0.7, evidenceVideoIds = emptyList()),
                    ),
            )

        val candidates = source.collectCandidates()

        assertEquals(listOf("아이브", "다비치", "뉴진스"), candidates.map { it.word })
        assertEquals(listOf(1, 2, 3), candidates.map { it.rank })
        assertTrue(candidates.all { it.source == TrendCandidateSourceType.YOUTUBE_POPULAR })
        assertEquals(LocalDateTime.of(2026, 6, 1, 3, 0), candidates.first().collectedAt)
        assertEquals(500_000L, candidates.first().totalViewCount)
        assertTrue(candidates.none { it.word == "fallbackword" })

        val request = keywordCandidateExtractor.lastRequest
        assertEquals(1, request.videos.size)
        assertEquals("video-1", request.videos.single().videoId)
        assertEquals("긴 설명", request.videos.single().description)
    }

    @Test
    fun `collectCandidates keeps Gemini candidates without evidence videos`() {
        Mockito
            .`when`(youtubeApiClient.getPopularVideos(10))
            .thenReturn(
                listOf(
                    youtubeVideo(
                        videoId = "video-1",
                        title = "다비치 컴백 무대",
                        viewCount = 2_000_000L,
                    ),
                ),
            )
        keywordCandidateExtractor.result =
            KeywordCandidateExtractionResult(
                candidates =
                    listOf(
                        extractedCandidate("아이브", confidence = 0.95, evidenceVideoIds = emptyList()),
                    ),
            )

        val candidates = source.collectCandidates()

        assertEquals("아이브", candidates.first().word)
        assertEquals(1, candidates.first().evidenceCount)
        assertEquals(0L, candidates.first().totalViewCount)
    }

    @Test
    fun `collectCandidates supplements Gemini candidates with token fallback when extracted candidates are too few`() {
        Mockito
            .`when`(youtubeApiClient.getPopularVideos(10))
            .thenReturn(
                listOf(
                    youtubeVideo(
                        videoId = "video-1",
                        title = "다비치 컴백 무대",
                        tags = listOf("다비치"),
                        viewCount = 2_000_000L,
                    ),
                    youtubeVideo(
                        videoId = "video-2",
                        title = "fallbackword 새 밈",
                        tags = listOf("fallbackword"),
                        viewCount = 1_000_000L,
                    ),
                ),
            )
        keywordCandidateExtractor.result =
            KeywordCandidateExtractionResult(
                candidates =
                    listOf(
                        extractedCandidate("다비치", confidence = 0.95, evidenceVideoIds = listOf("video-1")),
                    ),
            )

        val candidates = source.collectCandidates()

        assertEquals("다비치", candidates.first().word)
        assertTrue(candidates.any { it.word == "fallbackword" })
        assertEquals(listOf(1, 2, 3, 4, 5), candidates.map { it.rank })
        assertEquals(1, candidates.count { it.word == "다비치" })
    }

    @Test
    fun `collectCandidates falls back to token extractor when Gemini returns empty result`() {
        Mockito
            .`when`(youtubeApiClient.getPopularVideos(10))
            .thenReturn(
                listOf(
                    youtubeVideo(
                        videoId = "video-1",
                        title = "fallbackword 단독 영상",
                        tags = listOf("fallbackword"),
                        viewCount = 2_000_000L,
                    ),
                ),
            )
        keywordCandidateExtractor.result = KeywordCandidateExtractionResult()

        val candidates = source.collectCandidates()

        assertTrue(candidates.any { it.word == "fallbackword" })
    }

    private fun youtubeVideo(
        videoId: String,
        title: String,
        description: String? = null,
        tags: List<String> = emptyList(),
        viewCount: Long? = null,
    ): YoutubeVideoDetail =
        YoutubeVideoDetail(
            videoId = videoId,
            title = title,
            description = description,
            tags = tags,
            channelId = "channel-$videoId",
            channelName = "채널",
            thumbnailUrl = null,
            viewCount = viewCount,
            publishedAt = LocalDateTime.of(2026, 5, 31, 12, 0),
            durationSeconds = null,
            categoryId = null,
        )

    private fun extractedCandidate(
        keyword: String,
        confidence: Double,
        evidenceVideoIds: List<String>,
    ): ExtractedKeywordCandidate =
        ExtractedKeywordCandidate(
            keyword = keyword,
            confidence = confidence,
            evidenceVideoIds = evidenceVideoIds,
        )

    private class RecordingKeywordCandidateExtractor : KeywordCandidateExtractor {
        lateinit var lastRequest: KeywordCandidateExtractionRequest
        var result: KeywordCandidateExtractionResult = KeywordCandidateExtractionResult()

        override fun extract(request: KeywordCandidateExtractionRequest): KeywordCandidateExtractionResult {
            lastRequest = request
            return result
        }
    }
}
