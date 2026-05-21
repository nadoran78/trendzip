package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendFeedKeywordRelationType
import com.mztrend.repository.command.KeywordRelationRepository
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendFeedKeywordRepository
import com.mztrend.repository.command.TrendFeedRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.service.crawling.CollectedKeyword
import com.mztrend.service.crawling.CollectedKeywordRelation
import com.mztrend.service.crawling.CollectedKeywordVideoMapping
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedVideo
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.cache.CacheManager
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@SpringBootTest
@ActiveProfiles("test")
class TrendCrawlingServiceTest {
    @Autowired
    private lateinit var trendCrawlingService: TrendCrawlingService

    @Autowired
    private lateinit var keywordRepository: KeywordRepository

    @Autowired
    private lateinit var trendFeedRepository: TrendFeedRepository

    @Autowired
    private lateinit var trendFeedKeywordRepository: TrendFeedKeywordRepository

    @Autowired
    private lateinit var keywordRelationRepository: KeywordRelationRepository

    @Autowired
    private lateinit var trendLogRepository: TrendLogRepository

    @Autowired
    private lateinit var cacheManager: CacheManager

    @BeforeEach
    fun setUp() {
        trendFeedKeywordRepository.deleteAll()
        keywordRelationRepository.deleteAll()
        trendLogRepository.deleteAll()
        trendFeedRepository.deleteAll()
        keywordRepository.deleteAll()
        cacheManager.getCache(CacheNames.KEYWORDS)?.clear()
        cacheManager.getCache(CacheNames.FEED)?.clear()
    }

    @Test
    fun `saveCollectedTrends stores collected data and keeps repeated saves idempotent`() {
        keywordRepository.save(
            Keyword(
                word = "기존 키워드",
                generation = Generation.TEEN,
                category = "음악",
                currentRank = 4,
                trendScore = 100L,
                rankTrend = RankTrend.SAME,
                rankDelta = 0,
            ),
        )
        cacheManager.getCache(CacheNames.KEYWORDS)?.put(Generation.TEEN.name, "stale")
        cacheManager.getCache(CacheNames.FEED)?.put(Generation.TEEN.name, "stale")

        val batch = batchWithDuplicateKeyword()

        val result = trendCrawlingService.saveCollectedTrends(batch)

        assertEquals(3, result.keywordCount)
        assertEquals(2, result.trendLogCount)
        assertEquals(2, result.videoCount)
        assertEquals(3, result.keywordVideoMappingCount)
        assertEquals(1, result.keywordRelationCount)

        val existingKeyword = keywordRepository.findByGenerationAndWord(Generation.TEEN, "기존 키워드")
        assertNotNull(existingKeyword)
        assertEquals(2, existingKeyword.currentRank)
        assertEquals(500L, existingKeyword.trendScore)
        assertEquals(RankTrend.UP, existingKeyword.rankTrend)
        assertEquals(2, existingKeyword.rankDelta)

        val newKeyword = keywordRepository.findByGenerationAndWord(Generation.TEEN, "신규 키워드")
        assertNotNull(newKeyword)
        assertEquals(RankTrend.NEW, newKeyword.rankTrend)
        assertEquals("신규 키워드가 뜨는 이유", newKeyword.explain)

        assertEquals(3, keywordRepository.count())
        assertEquals(2, trendFeedRepository.count())
        assertEquals(3, trendFeedKeywordRepository.count())
        assertEquals(1, keywordRelationRepository.count())
        assertEquals(2, trendLogRepository.count())
        assertNull(cacheManager.getCache(CacheNames.KEYWORDS)?.get(Generation.TEEN.name))
        assertNull(cacheManager.getCache(CacheNames.FEED)?.get(Generation.TEEN.name))

        trendCrawlingService.saveCollectedTrends(batchWithSparseVideo())

        assertEquals(3, keywordRepository.count())
        assertEquals(2, trendFeedRepository.count())
        assertEquals(3, trendFeedKeywordRepository.count())
        assertEquals(1, keywordRelationRepository.count())
        assertEquals(4, trendLogRepository.count())

        val firstVideo = trendFeedRepository.findByYoutubeVideoId("video-1")
        assertNotNull(firstVideo)
        assertEquals("첫 번째 영상 수정", firstVideo.title)
        assertEquals("channel-1", firstVideo.channelId)
        assertEquals("음악", firstVideo.channelCategory)
        assertEquals(1_000_000L, firstVideo.channelSubscriberCount)
        assertEquals("https://img.example/video-1.jpg", firstVideo.thumbnailUrl)
        assertEquals(100_000L, firstVideo.viewCount)
        assertEquals(LocalDateTime.of(2026, 5, 20, 10, 0), firstVideo.publishedAt)
        assertEquals(180, firstVideo.durationSeconds)
        assertEquals("HOT", firstVideo.badge)

        val primaryMapping =
            trendFeedKeywordRepository.findByTrendFeedIdAndKeywordId(
                requireNotNull(firstVideo.id),
                requireNotNull(existingKeyword.id),
            )
        assertNotNull(primaryMapping)
        assertEquals(TrendFeedKeywordRelationType.PRIMARY, primaryMapping.relationType)
        assertEquals(FeedSection.TODAY_PICK, primaryMapping.feedSection)
    }

    private fun collectedBatch(): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = Generation.TEEN,
            keywords =
                listOf(
                    CollectedKeyword(
                        word = "기존 키워드",
                        category = "음악",
                        currentRank = 2,
                        trendScore = 500L,
                    ),
                    CollectedKeyword(
                        word = "신규 키워드",
                        category = "엔터",
                        currentRank = 1,
                        trendScore = 1_000L,
                        explain = "신규 키워드가 뜨는 이유",
                        explainedAt = LocalDateTime.of(2026, 5, 21, 9, 0),
                    ),
                    CollectedKeyword(
                        word = "태그 키워드",
                        category = "태그",
                    ),
                ),
            videos =
                listOf(
                    CollectedVideo(
                        youtubeVideoId = "video-1",
                        title = "첫 번째 영상",
                        channelId = "channel-1",
                        channelName = "트렌드 채널",
                        channelCategory = "음악",
                        channelSubscriberCount = 1_000_000L,
                        thumbnailUrl = "https://img.example/video-1.jpg",
                        viewCount = 100_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 20, 10, 0),
                        durationSeconds = 180,
                        badge = "HOT",
                    ),
                    CollectedVideo(
                        youtubeVideoId = "video-2",
                        title = "두 번째 영상",
                        channelName = "랭킹 채널",
                        viewCount = 50_000L,
                    ),
                ),
            keywordVideoMappings =
                listOf(
                    CollectedKeywordVideoMapping(
                        keywordWord = "기존 키워드",
                        youtubeVideoId = "video-1",
                        relationType = TrendFeedKeywordRelationType.PRIMARY,
                        feedSection = FeedSection.TODAY_PICK,
                        displayOrder = 1,
                        score = 95,
                        source = "fake",
                    ),
                    CollectedKeywordVideoMapping(
                        keywordWord = "신규 키워드",
                        youtubeVideoId = "video-1",
                        relationType = TrendFeedKeywordRelationType.TAG,
                        feedSection = FeedSection.TODAY_PICK,
                        displayOrder = 2,
                        score = 80,
                        source = "fake",
                    ),
                    CollectedKeywordVideoMapping(
                        keywordWord = "신규 키워드",
                        youtubeVideoId = "video-2",
                        relationType = TrendFeedKeywordRelationType.PRIMARY,
                        feedSection = FeedSection.RISING,
                        displayOrder = 1,
                        score = 90,
                        source = "fake",
                    ),
                ),
            keywordRelations =
                listOf(
                    CollectedKeywordRelation(
                        keywordWord = "신규 키워드",
                        relatedKeywordWord = "태그 키워드",
                        displayOrder = 1,
                        score = 70,
                        source = "fake",
                    ),
                ),
        )

    private fun batchWithSparseVideo(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            videos =
                batch.videos.map { video ->
                    if (video.youtubeVideoId != "video-1") {
                        video
                    } else {
                        CollectedVideo(
                            youtubeVideoId = video.youtubeVideoId,
                            title = "첫 번째 영상 수정",
                            channelName = "트렌드 채널 수정",
                        )
                    }
                },
        )
    }

    private fun batchWithDuplicateKeyword(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            keywords =
                batch.keywords +
                    CollectedKeyword(
                        word = "신규 키워드",
                        category = "중복",
                        currentRank = 99,
                        trendScore = 999_999L,
                    ),
        )
    }
}
