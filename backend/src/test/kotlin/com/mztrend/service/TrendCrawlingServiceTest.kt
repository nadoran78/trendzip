package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.domain.TrendLog
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.repository.command.KeywordRelationRepository
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendCrawlRunRepository
import com.mztrend.repository.command.TrendFeedItemRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.repository.command.TrendVideoKeywordRepository
import com.mztrend.repository.command.TrendVideoRepository
import com.mztrend.service.crawling.CollectedFeedItem
import com.mztrend.service.crawling.CollectedKeyword
import com.mztrend.service.crawling.CollectedKeywordRelation
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedVideo
import com.mztrend.service.crawling.CollectedVideoKeyword
import com.mztrend.service.crawling.KeywordExplainGenerator
import com.mztrend.service.crawling.KeywordExplainRefreshReason
import com.mztrend.service.crawling.KeywordExplainRequest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.cache.CacheManager
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@SpringBootTest
@ActiveProfiles("test")
class TrendCrawlingServiceTest {
    @Autowired
    private lateinit var trendCrawlingService: TrendCrawlingService

    @Autowired
    private lateinit var keywordRepository: KeywordRepository

    @Autowired
    private lateinit var trendVideoRepository: TrendVideoRepository

    @Autowired
    private lateinit var trendFeedItemRepository: TrendFeedItemRepository

    @Autowired
    private lateinit var trendVideoKeywordRepository: TrendVideoKeywordRepository

    @Autowired
    private lateinit var keywordRelationRepository: KeywordRelationRepository

    @Autowired
    private lateinit var trendLogRepository: TrendLogRepository

    @Autowired
    private lateinit var trendCrawlRunRepository: TrendCrawlRunRepository

    @Autowired
    private lateinit var cacheManager: CacheManager

    @Autowired
    private lateinit var recordingKeywordExplainGenerator: RecordingKeywordExplainGenerator

    @BeforeEach
    fun setUp() {
        trendVideoKeywordRepository.deleteAll()
        trendFeedItemRepository.deleteAll()
        keywordRelationRepository.deleteAll()
        trendLogRepository.deleteAll()
        trendCrawlRunRepository.deleteAll()
        trendVideoRepository.deleteAll()
        keywordRepository.deleteAll()
        cacheManager.getCache(CacheNames.KEYWORDS)?.clear()
        cacheManager.getCache(CacheNames.FEED)?.clear()
        recordingKeywordExplainGenerator.clear()
    }

    @Test
    fun `saveCollectedTrends stores collected data and replaces active feed items`() {
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
        assertEquals(2, result.feedItemCount)
        assertEquals(1, result.videoKeywordCount)
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
        assertEquals(2, trendVideoRepository.count())
        assertEquals(2, trendFeedItemRepository.count())
        assertEquals(1, trendVideoKeywordRepository.count())
        assertEquals(1, keywordRelationRepository.count())
        assertEquals(1, activeKeywordRelationCount())
        assertEquals(2, trendLogRepository.count())
        val firstCrawlRun = trendCrawlRunRepository.findAll().single()
        assertEquals(TrendCrawlRunStatus.COMPLETED, firstCrawlRun.status)
        assertNotNull(firstCrawlRun.completedAt)
        assertTrue(trendLogRepository.findAll().all { it.crawlRunId == firstCrawlRun.id })
        assertNull(cacheManager.getCache(CacheNames.KEYWORDS)?.get(Generation.TEEN.name))
        assertNull(cacheManager.getCache(CacheNames.FEED)?.get(Generation.TEEN.name))

        trendCrawlingService.saveCollectedTrends(batchWithSparseVideo())

        assertEquals(3, keywordRepository.count())
        assertEquals(2, trendVideoRepository.count())
        assertEquals(4, trendFeedItemRepository.count())
        assertEquals(1, trendVideoKeywordRepository.count())
        assertEquals(2, keywordRelationRepository.count())
        assertEquals(1, activeKeywordRelationCount())
        assertEquals(4, trendLogRepository.count())
        assertEquals(2, trendCrawlRunRepository.count())
        assertEquals(2, trendFeedItemRepository.findAllByGenerationAndIsActiveTrue(Generation.TEEN).size)

        val firstVideo = trendVideoRepository.findByYoutubeVideoId("video-1")
        assertNotNull(firstVideo)
        assertEquals("첫 번째 영상 수정", firstVideo.title)
        assertEquals("channel-1", firstVideo.channelId)
        assertEquals("음악", firstVideo.channelCategory)
        assertEquals(1_000_000L, firstVideo.channelSubscriberCount)
        assertEquals("https://img.example/video-1.jpg", firstVideo.thumbnailUrl)
        assertEquals(100_000L, firstVideo.viewCount)
        assertEquals(LocalDateTime.of(2026, 5, 20, 10, 0), firstVideo.publishedAt)
        assertEquals(180, firstVideo.durationSeconds)

        val activeFeedItem =
            trendFeedItemRepository
                .findAllByGenerationAndIsActiveTrue(Generation.TEEN)
                .first { it.trendVideoId == firstVideo.id }
        assertEquals(requireNotNull(existingKeyword.id), activeFeedItem.primaryKeywordId)
        assertEquals(FeedSection.TODAY_PICK, activeFeedItem.feedSection)
        assertEquals("HOT", activeFeedItem.badge)

        val videoKeyword =
            trendVideoKeywordRepository.findByTrendVideoIdAndKeywordId(
                requireNotNull(firstVideo.id),
                requireNotNull(newKeyword.id),
            )
        assertNotNull(videoKeyword)
        assertEquals(TrendVideoKeywordRelationType.TAG, videoKeyword.relationType)
    }

    @Test
    fun `saveCollectedTrends replaces keyword relations for collected keywords`() {
        val batch = collectedBatch()

        trendCrawlingService.saveCollectedTrends(batch)

        assertEquals(1, keywordRelationRepository.count())
        assertEquals(1, activeKeywordRelationCount())

        trendCrawlingService.saveCollectedTrends(batch.copy(keywordRelations = emptyList()))

        val savedRelations = keywordRelationRepository.findAll()
        assertEquals(1, savedRelations.size)
        assertEquals(0, activeKeywordRelationCount())
        assertNotNull(savedRelations.single().deactivatedAt)
    }

    @Test
    fun `saveCollectedTrends keeps active feed items when collected feed items are empty`() {
        trendCrawlingService.saveCollectedTrends(collectedBatch())
        val activeFeedVideoIds = activeFeedVideoIds()

        val result = trendCrawlingService.saveCollectedTrends(collectedBatch().copy(feedItems = emptyList()))

        assertEquals(3, result.keywordCount)
        assertEquals(2, result.trendLogCount)
        assertEquals(2, result.videoCount)
        assertEquals(0, result.feedItemCount)
        assertEquals(activeFeedVideoIds, activeFeedVideoIds())
        assertEquals(2, trendFeedItemRepository.count())
        assertEquals(2, trendFeedItemRepository.findAllByGenerationAndIsActiveTrue(Generation.TEEN).size)
    }

    @Test
    fun `saveCollectedTrends rejects duplicate feed item videos before saving`() {
        trendCrawlingService.saveCollectedTrends(collectedBatch())
        val activeFeedVideoIds = activeFeedVideoIds()
        val trendLogCount = trendLogRepository.count()
        val crawlRunCount = trendCrawlRunRepository.count()
        val explainRequestCount = recordingKeywordExplainGenerator.requests.size

        val exception =
            assertFailsWith<IllegalArgumentException> {
                trendCrawlingService.saveCollectedTrends(batchWithDuplicateFeedItemVideo())
            }

        assertTrue(
            exception.message.orEmpty().contains("duplicatedYoutubeVideoIds=[video-1]"),
        )
        assertEquals(activeFeedVideoIds, activeFeedVideoIds())
        assertEquals(2, trendFeedItemRepository.count())
        assertEquals(trendLogCount, trendLogRepository.count())
        assertEquals(crawlRunCount, trendCrawlRunRepository.count())
        assertEquals(explainRequestCount, recordingKeywordExplainGenerator.requests.size)
        assertTrue(trendCrawlRunRepository.findAll().all { it.status == TrendCrawlRunStatus.COMPLETED })
    }

    @Test
    fun `saveCollectedTrends rejects feed item unknown video before crawling run and explain generation`() {
        trendCrawlingService.saveCollectedTrends(collectedBatch())
        val activeFeedVideoIds = activeFeedVideoIds()
        val trendLogCount = trendLogRepository.count()
        val crawlRunCount = trendCrawlRunRepository.count()
        val explainRequestCount = recordingKeywordExplainGenerator.requests.size

        val exception =
            assertFailsWith<IllegalArgumentException> {
                trendCrawlingService.saveCollectedTrends(batchWithUnknownFeedItemVideo())
            }

        assertTrue(
            exception.message.orEmpty().contains("type=feedItems.youtubeVideoId, unknownValues=[unknown-video]"),
        )
        assertEquals(activeFeedVideoIds, activeFeedVideoIds())
        assertEquals(2, trendFeedItemRepository.count())
        assertEquals(trendLogCount, trendLogRepository.count())
        assertEquals(crawlRunCount, trendCrawlRunRepository.count())
        assertEquals(explainRequestCount, recordingKeywordExplainGenerator.requests.size)
    }

    @Test
    fun `saveCollectedTrends rejects video keyword unknown keyword before crawling run and explain generation`() {
        val exception =
            assertFailsWith<IllegalArgumentException> {
                trendCrawlingService.saveCollectedTrends(batchWithUnknownVideoKeyword())
            }

        assertTrue(
            exception.message.orEmpty().contains("type=videoKeywords.keywordWord, unknownValues=[없는 키워드]"),
        )
        assertEquals(0, trendCrawlRunRepository.count())
        assertTrue(recordingKeywordExplainGenerator.requests.isEmpty())
    }

    @Test
    fun `saveCollectedTrends generates explain for new keyword without collected explain`() {
        val batch = batchWithNewKeywordWithoutExplain()

        trendCrawlingService.saveCollectedTrends(batch)

        val newKeyword = keywordRepository.findByGenerationAndWord(Generation.TEEN, "신규 키워드")
        assertNotNull(newKeyword)
        assertEquals(
            "신규 키워드는 관련 영상에서 반복적으로 언급되고 조회 맥락도 분명해 현재 세대의 관심을 받는 흐름으로 볼 수 있습니다.",
            newKeyword.explain,
        )
        assertEquals(listOf("기존 키워드", "신규 키워드"), recordingKeywordExplainGenerator.requests.map { it.keyword.word })
    }

    @Test
    fun `saveCollectedTrends skips unchanged keyword with existing explain`() {
        val existingKeyword =
            keywordRepository.save(
                Keyword(
                    word = "아이브",
                    generation = Generation.TEEN,
                    currentRank = 1,
                    trendScore = 100_000L,
                    explain = "기존 설명",
                    explainedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                ),
            )
        trendLogRepository.saveAll(
            listOf(
                trendLog(requireNotNull(existingKeyword.id), rank = 1, recordedAt = LocalDateTime.of(2026, 5, 1, 3, 0)),
                trendLog(requireNotNull(existingKeyword.id), rank = 1, recordedAt = LocalDateTime.of(2026, 5, 8, 3, 0)),
            ),
        )

        trendCrawlingService.saveCollectedTrends(
            minimalBatch(
                CollectedKeyword(
                    word = "아이브",
                    currentRank = 1,
                    trendScore = 110_000L,
                ),
            ),
        )

        assertTrue(recordingKeywordExplainGenerator.requests.isEmpty())
        val savedKeyword = keywordRepository.findByGenerationAndWord(Generation.TEEN, "아이브")
        assertNotNull(savedKeyword)
        assertEquals("기존 설명", savedKeyword.explain)
    }

    @Test
    fun `saveCollectedTrends keeps previous explain when refresh generation fails`() {
        val existingKeyword =
            keywordRepository.save(
                Keyword(
                    word = "급상승",
                    generation = Generation.TEEN,
                    currentRank = 7,
                    trendScore = 10_000L,
                    explain = "기존 설명",
                    explainedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                ),
            )
        val previousRun = saveCompletedRun(LocalDateTime.of(2026, 5, 8, 3, 0))
        trendLogRepository.saveAll(
            listOf(
                trendLog(
                    requireNotNull(existingKeyword.id),
                    rank = 7,
                    recordedAt = LocalDateTime.of(2026, 5, 8, 3, 0),
                    crawlRunId = requireNotNull(previousRun.id),
                ),
            ),
        )
        recordingKeywordExplainGenerator.failureWords = setOf("급상승")

        trendCrawlingService.saveCollectedTrends(
            minimalBatch(
                CollectedKeyword(
                    word = "급상승",
                    currentRank = 2,
                    trendScore = 150_000L,
                ),
            ),
        )

        val savedKeyword = keywordRepository.findByGenerationAndWord(Generation.TEEN, "급상승")
        assertNotNull(savedKeyword)
        assertEquals("기존 설명", savedKeyword.explain)
        assertEquals(KeywordExplainRefreshReason.RANK_SURGED, recordingKeywordExplainGenerator.requests.single().refreshReason)
    }

    @Test
    fun `saveCollectedTrends detects reentry from old trend log outside recent run window`() {
        val existingKeyword =
            keywordRepository.save(
                Keyword(
                    word = "재등장",
                    generation = Generation.TEEN,
                    currentRank = null,
                    trendScore = 10_000L,
                    explain = "기존 설명",
                    explainedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                ),
            )
        val oldRun = saveCompletedRun(LocalDateTime.of(2026, 5, 1, 3, 0))
        trendLogRepository.save(
            trendLog(
                requireNotNull(existingKeyword.id),
                rank = 8,
                recordedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                crawlRunId = requireNotNull(oldRun.id),
            ),
        )
        saveCompletedRun(LocalDateTime.of(2026, 5, 8, 3, 0))
        saveCompletedRun(LocalDateTime.of(2026, 5, 15, 3, 0))
        saveCompletedRun(LocalDateTime.of(2026, 5, 22, 3, 0))

        trendCrawlingService.saveCollectedTrends(
            minimalBatch(
                CollectedKeyword(
                    word = "재등장",
                    currentRank = 4,
                    trendScore = 120_000L,
                ),
            ),
        )

        assertEquals(KeywordExplainRefreshReason.RE_ENTRY, recordingKeywordExplainGenerator.requests.single().refreshReason)
    }

    @Test
    fun `saveCollectedTrends does not detect reentry from failed run trend log`() {
        val existingKeyword =
            keywordRepository.save(
                Keyword(
                    word = "실패회차",
                    generation = Generation.TEEN,
                    currentRank = null,
                    trendScore = 10_000L,
                    explain = "기존 설명",
                    explainedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                ),
            )
        val failedRun = saveFailedRun(LocalDateTime.of(2026, 5, 1, 3, 0))
        trendLogRepository.save(
            trendLog(
                requireNotNull(existingKeyword.id),
                rank = 8,
                recordedAt = LocalDateTime.of(2026, 5, 1, 3, 0),
                crawlRunId = requireNotNull(failedRun.id),
            ),
        )
        saveCompletedRun(LocalDateTime.of(2026, 5, 8, 3, 0))

        trendCrawlingService.saveCollectedTrends(
            minimalBatch(
                CollectedKeyword(
                    word = "실패회차",
                    currentRank = 4,
                    trendScore = 120_000L,
                ),
            ),
        )

        assertTrue(recordingKeywordExplainGenerator.requests.isEmpty())
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
                    ),
                    CollectedVideo(
                        youtubeVideoId = "video-2",
                        title = "두 번째 영상",
                        channelName = "랭킹 채널",
                        viewCount = 50_000L,
                    ),
                ),
            feedItems =
                listOf(
                    CollectedFeedItem(
                        keywordWord = "기존 키워드",
                        youtubeVideoId = "video-1",
                        feedSection = FeedSection.TODAY_PICK,
                        displayOrder = 1,
                        score = 95,
                        badge = "HOT",
                        source = "fake",
                    ),
                    CollectedFeedItem(
                        keywordWord = "신규 키워드",
                        youtubeVideoId = "video-2",
                        feedSection = FeedSection.RISING,
                        displayOrder = 1,
                        score = 90,
                        source = "fake",
                    ),
                ),
            videoKeywords =
                listOf(
                    CollectedVideoKeyword(
                        keywordWord = "신규 키워드",
                        youtubeVideoId = "video-1",
                        relationType = TrendVideoKeywordRelationType.TAG,
                        displayOrder = 2,
                        score = 80,
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

    private fun batchWithDuplicateFeedItemVideo(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            feedItems =
                batch.feedItems +
                    CollectedFeedItem(
                        keywordWord = "신규 키워드",
                        youtubeVideoId = "video-1",
                        feedSection = FeedSection.RELATED,
                        displayOrder = 2,
                        score = 70,
                        source = "fake",
                    ),
        )
    }

    private fun batchWithNewKeywordWithoutExplain(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            keywords =
                batch.keywords.map { keyword ->
                    if (keyword.word != "신규 키워드") {
                        keyword
                    } else {
                        keyword.copy(explain = null, explainedAt = null)
                    }
                },
        )
    }

    private fun batchWithUnknownFeedItemVideo(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            feedItems =
                batch.feedItems.map { feedItem ->
                    if (feedItem.youtubeVideoId != "video-1") {
                        feedItem
                    } else {
                        feedItem.copy(youtubeVideoId = "unknown-video")
                    }
                },
        )
    }

    private fun batchWithUnknownVideoKeyword(): CollectedTrendBatch {
        val batch = collectedBatch()
        return batch.copy(
            videoKeywords =
                listOf(
                    CollectedVideoKeyword(
                        keywordWord = "없는 키워드",
                        youtubeVideoId = "video-1",
                        relationType = TrendVideoKeywordRelationType.TAG,
                        displayOrder = 1,
                        score = 80,
                        source = "fake",
                    ),
                ),
        )
    }

    private fun minimalBatch(keyword: CollectedKeyword): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = Generation.TEEN,
            keywords = listOf(keyword),
            videos = emptyList(),
            feedItems = emptyList(),
            videoKeywords = emptyList(),
            keywordRelations = emptyList(),
        )

    private fun trendLog(
        keywordId: Long,
        rank: Int?,
        recordedAt: LocalDateTime,
        crawlRunId: Long = 0,
    ): TrendLog =
        TrendLog(
            crawlRunId = crawlRunId,
            keywordId = keywordId,
            rank = rank,
            score = 100_000L,
        ).also { it.recordedAt = recordedAt }

    private fun saveCompletedRun(startedAt: LocalDateTime): TrendCrawlRun =
        trendCrawlRunRepository.save(
            TrendCrawlRun(
                generation = Generation.TEEN,
                status = TrendCrawlRunStatus.COMPLETED,
                startedAt = startedAt,
                completedAt = startedAt.plusMinutes(5),
            ),
        )

    private fun saveFailedRun(startedAt: LocalDateTime): TrendCrawlRun =
        trendCrawlRunRepository.save(
            TrendCrawlRun(
                generation = Generation.TEEN,
                status = TrendCrawlRunStatus.FAILED,
                startedAt = startedAt,
                completedAt = startedAt.plusMinutes(5),
            ),
        )

    private fun activeFeedVideoIds(): List<Long> =
        trendFeedItemRepository
            .findAllByGenerationAndIsActiveTrue(Generation.TEEN)
            .map { it.trendVideoId }
            .sorted()

    private fun activeKeywordRelationCount(): Int = keywordRelationRepository.findAll().count { it.isActive }

    @TestConfiguration
    class KeywordExplainTestConfig {
        @Bean
        @Primary
        fun recordingKeywordExplainGenerator(): RecordingKeywordExplainGenerator = RecordingKeywordExplainGenerator()
    }

    class RecordingKeywordExplainGenerator : KeywordExplainGenerator {
        val requests: MutableList<KeywordExplainRequest> = mutableListOf()
        var failureWords: Set<String> = emptySet()

        override fun generate(request: KeywordExplainRequest): String {
            requests += request
            if (failureWords.contains(request.keyword.word)) {
                throw IllegalStateException("failed keyword=${request.keyword.word}")
            }

            return "${request.keyword.word}는 관련 영상에서 반복적으로 언급되고 조회 맥락도 분명해 현재 세대의 관심을 받는 흐름으로 볼 수 있습니다."
        }

        fun clear() {
            requests.clear()
            failureWords = emptySet()
        }
    }
}
