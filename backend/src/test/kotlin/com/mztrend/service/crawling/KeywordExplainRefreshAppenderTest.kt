package com.mztrend.service.crawling

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendVideoKeywordRelationType
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertNull

class KeywordExplainRefreshAppenderTest {
    @Test
    fun `appendExplains generates explains with related video context`() {
        val generator = RecordingKeywordExplainGenerator(mapOf("아이브" to { " 아이브 설명 " }))
        val appender = appender(generator)
        val batch = collectedBatch()

        val updatedBatch =
            appender.appendExplains(
                batch = batch,
                refreshDecisions =
                    listOf(
                        KeywordExplainRefreshDecision(
                            keyword = batch.keywords.single { it.word == "아이브" },
                            reason = KeywordExplainRefreshReason.FIRST_CONTINUED,
                            previousExplain = "기존 설명",
                            previousRank = 2,
                            consecutiveWeeks = 2,
                        ),
                    ),
            )

        val updatedKeyword = updatedBatch.keywords.single { it.word == "아이브" }
        assertEquals("아이브 설명", updatedKeyword.explain)
        assertEquals(FIXED_NOW, updatedKeyword.explainedAt)
        assertContentEquals(listOf("아이브"), generator.requests.map { it.keyword.word })
        assertEquals(KeywordExplainRefreshReason.FIRST_CONTINUED, generator.requests.single().refreshReason)
        assertContentEquals(
            listOf("video-2", "video-1"),
            generator
                .requests
                .single()
                .videos
                .map { it.youtubeVideoId },
        )
    }

    @Test
    fun `appendExplains keeps original keyword when generation fails or response is blank`() {
        val generator =
            RecordingKeywordExplainGenerator(
                mapOf(
                    "아이브" to { throw IllegalStateException("quota exceeded") },
                    "뉴진스" to { " " },
                ),
            )
        val appender = appender(generator)
        val batch = collectedBatch()

        val updatedBatch =
            appender.appendExplains(
                batch = batch,
                refreshDecisions =
                    listOf(
                        KeywordExplainRefreshDecision(
                            keyword = batch.keywords.single { it.word == "아이브" },
                            reason = KeywordExplainRefreshReason.RANK_SURGED,
                        ),
                        KeywordExplainRefreshDecision(
                            keyword = batch.keywords.single { it.word == "뉴진스" },
                            reason = KeywordExplainRefreshReason.NEW_KEYWORD,
                        ),
                    ),
            )

        assertNull(updatedBatch.keywords.single { it.word == "아이브" }.explain)
        assertNull(updatedBatch.keywords.single { it.word == "뉴진스" }.explain)
        assertContentEquals(listOf("아이브", "뉴진스"), generator.requests.map { it.keyword.word })
    }

    private fun appender(generator: KeywordExplainGenerator): KeywordExplainRefreshAppender =
        KeywordExplainRefreshAppender(
            keywordExplainGenerator = generator,
            clock = FIXED_CLOCK,
        )

    private fun collectedBatch(): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = Generation.TEEN,
            keywords =
                listOf(
                    CollectedKeyword(word = "아이브", currentRank = 1, trendScore = 100_000L),
                    CollectedKeyword(word = "뉴진스", currentRank = 2, trendScore = 90_000L),
                ),
            videos =
                listOf(
                    collectedVideo("video-1"),
                    collectedVideo("video-2"),
                    collectedVideo("video-3"),
                ),
            feedItems =
                listOf(
                    CollectedFeedItem(
                        keywordWord = "아이브",
                        youtubeVideoId = "video-2",
                        feedSection = FeedSection.TODAY_PICK,
                    ),
                ),
            videoKeywords =
                listOf(
                    CollectedVideoKeyword(
                        keywordWord = "아이브",
                        youtubeVideoId = "video-1",
                        relationType = TrendVideoKeywordRelationType.RELATED,
                    ),
                    CollectedVideoKeyword(
                        keywordWord = "아이브",
                        youtubeVideoId = "video-2",
                        relationType = TrendVideoKeywordRelationType.TAG,
                    ),
                    CollectedVideoKeyword(
                        keywordWord = "뉴진스",
                        youtubeVideoId = "video-3",
                        relationType = TrendVideoKeywordRelationType.RELATED,
                    ),
                ),
            keywordRelations = emptyList(),
        )

    private fun collectedVideo(youtubeVideoId: String): CollectedVideo =
        CollectedVideo(
            youtubeVideoId = youtubeVideoId,
            title = "영상 $youtubeVideoId",
            channelName = "채널 $youtubeVideoId",
        )

    private class RecordingKeywordExplainGenerator(
        private val responsesByWord: Map<String, () -> String>,
    ) : KeywordExplainGenerator {
        val requests: MutableList<KeywordExplainRequest> = mutableListOf()

        override fun generate(request: KeywordExplainRequest): String {
            requests += request
            return responsesByWord[request.keyword.word]?.invoke().orEmpty()
        }
    }

    companion object {
        private val FIXED_CLOCK = Clock.fixed(Instant.parse("2026-05-31T18:00:00Z"), ZoneId.of("Asia/Seoul"))
        private val FIXED_NOW = LocalDateTime.of(2026, 6, 1, 3, 0)
    }
}
