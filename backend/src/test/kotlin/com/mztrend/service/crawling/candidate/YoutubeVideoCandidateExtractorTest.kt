package com.mztrend.service.crawling.candidate

import com.mztrend.client.dto.YoutubeVideoDetail
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class YoutubeVideoCandidateExtractorTest {
    private val extractor = YoutubeVideoCandidateExtractor()

    @Test
    fun `extract creates ranked candidates from popular video metadata`() {
        val collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0)

        val candidates =
            extractor.extract(
                videos =
                    listOf(
                        youtubeVideo(
                            videoId = "video-1",
                            title = "아이브 Official MV #아이브",
                            description = "아이브 컴백 무대 https://example.com",
                            tags = listOf("아이브", "IVE", "official"),
                            channelName = "아이브",
                            viewCount = 2_000_000,
                        ),
                        youtubeVideo(
                            videoId = "video-2",
                            title = "마라탕후루 shorts 영상",
                            description = "중독성 있는 챌린지 #마라탕후루 full version",
                            tags = listOf("마라탕후루", "챌린지"),
                            channelName = "트렌드 채널",
                            viewCount = 1_500_000,
                        ),
                    ),
                collectedAt = collectedAt,
                limit = 10,
            )

        val words = candidates.map { it.word }
        assertTrue("아이브" in words)
        assertTrue("마라탕후루" in words)
        assertFalse("official" in words)
        assertFalse("mv" in words)
        assertFalse("shorts" in words)
        assertFalse("영상" in words)

        val ive = candidates.single { it.word == "아이브" }
        assertEquals(TrendCandidateSourceType.YOUTUBE_POPULAR, ive.source)
        assertEquals(collectedAt, ive.collectedAt)
        assertEquals(2_000_000L, ive.totalViewCount)
        assertTrue(ive.evidenceCount > 1)
        assertTrue(ive.rank > 0)
        assertTrue(ive.score > 0)
    }

    @Test
    fun `extract applies limit after score ordering`() {
        val candidates =
            extractor.extract(
                videos =
                    listOf(
                        youtubeVideo(
                            videoId = "video-1",
                            title = "낮은점수",
                            viewCount = 10_000,
                        ),
                        youtubeVideo(
                            videoId = "video-2",
                            title = "높은점수 높은점수",
                            tags = listOf("높은점수"),
                            viewCount = 5_000_000,
                        ),
                    ),
                collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
                limit = 1,
            )

        assertEquals(1, candidates.size)
        assertEquals("높은점수", candidates.single().word)
        assertEquals(1, candidates.single().rank)
    }

    private fun youtubeVideo(
        videoId: String,
        title: String,
        description: String? = null,
        tags: List<String> = emptyList(),
        channelName: String = "채널",
        viewCount: Long? = null,
    ): YoutubeVideoDetail =
        YoutubeVideoDetail(
            videoId = videoId,
            title = title,
            description = description,
            tags = tags,
            channelId = "channel-$videoId",
            channelName = channelName,
            thumbnailUrl = null,
            viewCount = viewCount,
            publishedAt = LocalDateTime.of(2026, 5, 31, 12, 0),
            durationSeconds = null,
            categoryId = null,
        )
}
