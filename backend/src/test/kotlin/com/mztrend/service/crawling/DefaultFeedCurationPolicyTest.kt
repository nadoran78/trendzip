package com.mztrend.service.crawling

import com.mztrend.client.dto.YoutubeSearchVideo
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import com.mztrend.service.crawling.candidate.TrendCandidateSourceType
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals

class DefaultFeedCurationPolicyTest {
    private val policy = DefaultFeedCurationPolicy()

    @Test
    fun `curate makes top ranked keyword representative video today pick`() {
        val collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0)

        val feedItems =
            policy.curate(
                candidates =
                    listOf(
                        candidate("마라탕후루", rank = 2, videoId = "video-2", searchOrder = 1),
                        candidate("아이브", rank = 1, videoId = "video-1", searchOrder = 1),
                        candidate("아이브", rank = 1, videoId = "video-3", searchOrder = 2),
                    ),
                collectedAt = collectedAt,
            )

        assertEquals("video-1", feedItems[0].youtubeVideoId)
        assertEquals("아이브", feedItems[0].keywordWord)
        assertEquals(FeedSection.TODAY_PICK, feedItems[0].feedSection)
        assertEquals("HOT", feedItems[0].badge)
        assertEquals(collectedAt, feedItems[0].collectedAt)

        assertContentEquals(listOf(FeedSection.TODAY_PICK, FeedSection.RISING, FeedSection.RISING), feedItems.map { it.feedSection })
        assertContentEquals(listOf("HOT", "NEW", "NEW"), feedItems.map { it.badge })
    }

    @Test
    fun `curate keeps only one feed item per video using higher ranked keyword`() {
        val feedItems =
            policy.curate(
                candidates =
                    listOf(
                        candidate("마라탕후루", rank = 2, videoId = "video-1", searchOrder = 1),
                        candidate("아이브", rank = 1, videoId = "video-1", searchOrder = 2),
                    ),
                collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            )

        assertEquals(1, feedItems.size)
        assertEquals("아이브", feedItems.single().keywordWord)
        assertEquals("video-1", feedItems.single().youtubeVideoId)
        assertEquals(FeedSection.TODAY_PICK, feedItems.single().feedSection)
    }

    @Test
    fun `curate selects representative videos across keywords before extra videos`() {
        val feedItems =
            policy.curate(
                candidates =
                    listOf(
                        candidate("아이브", rank = 1, videoId = "video-1", searchOrder = 1),
                        candidate("아이브", rank = 1, videoId = "video-2", searchOrder = 2),
                        candidate("동궁", rank = 2, videoId = "video-3", searchOrder = 1),
                        candidate("남주혁", rank = 3, videoId = "video-4", searchOrder = 1),
                    ),
                collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            )

        assertContentEquals(listOf("아이브", "동궁", "남주혁", "아이브"), feedItems.map { it.keywordWord })
        assertContentEquals(listOf("video-1", "video-3", "video-4", "video-2"), feedItems.map { it.youtubeVideoId })
    }

    @Test
    fun `curate uses alternate video when keyword top search result is already selected`() {
        val feedItems =
            policy.curate(
                candidates =
                    listOf(
                        candidate("동궁", rank = 1, videoId = "video-1", searchOrder = 1),
                        candidate("남주혁", rank = 2, videoId = "video-1", searchOrder = 1),
                        candidate("남주혁", rank = 2, videoId = "video-2", searchOrder = 2),
                    ),
                collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            )

        assertContentEquals(listOf("동궁", "남주혁"), feedItems.map { it.keywordWord })
        assertContentEquals(listOf("video-1", "video-2"), feedItems.map { it.youtubeVideoId })
    }

    @Test
    fun `curate keeps remaining videos unique after representative selection`() {
        val feedItems =
            policy.curate(
                candidates =
                    listOf(
                        candidate("아이브", rank = 1, videoId = "video-1", searchOrder = 1),
                        candidate("동궁", rank = 2, videoId = "video-2", searchOrder = 1),
                        candidate("아이브", rank = 1, videoId = "video-3", searchOrder = 2),
                        candidate("동궁", rank = 2, videoId = "video-3", searchOrder = 2),
                    ),
                collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            )

        assertContentEquals(listOf("video-1", "video-2", "video-3"), feedItems.map { it.youtubeVideoId })
        assertEquals(feedItems.map { it.youtubeVideoId }.distinct().size, feedItems.size)
    }

    private fun candidate(
        word: String,
        rank: Int,
        videoId: String,
        searchOrder: Int,
    ): FeedCurationCandidate =
        FeedCurationCandidate(
            keyword =
                ScoredTrendKeyword(
                    generation = Generation.TEEN,
                    word = word,
                    rank = rank,
                    trendScore = 100_000L - rank,
                    averageRatio = 50.0,
                    maxRatio = 100.0,
                    source = TrendCandidateSourceType.YOUTUBE_POPULAR,
                    candidateScore = 1_000L,
                    collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
                ),
            video =
                YoutubeSearchVideo(
                    videoId = videoId,
                    title = "검색 영상 $videoId",
                    channelId = "channel-$videoId",
                    channelName = "검색 채널",
                    thumbnailUrl = null,
                    publishedAt = null,
                ),
            videoDetail =
                YoutubeVideoDetail(
                    videoId = videoId,
                    title = "상세 영상 $videoId",
                    description = null,
                    tags = emptyList(),
                    channelId = "channel-$videoId",
                    channelName = "상세 채널",
                    thumbnailUrl = null,
                    viewCount = 100_000L,
                    publishedAt = null,
                    durationSeconds = null,
                    categoryId = null,
                ),
            searchOrder = searchOrder,
        )
}
