package com.mztrend.service.crawling

import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.domain.TrendLog
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class KeywordExplainRefreshPolicyTest {
    private val policy =
        KeywordExplainRefreshPolicy(
            ExternalApiProperties(
                gemini =
                    ExternalApiProperties.Gemini(
                        maxExplainKeywordCount = 10,
                        rankSurgeThreshold = 3,
                        longRunningWeeks = 4,
                    ),
            ),
        )

    @Test
    fun `resolveRefreshTargets selects new and missing explain keywords`() {
        val missingExplainKeyword =
            keyword(
                id = 1,
                word = "아이브",
                currentRank = 2,
                explain = null,
            )

        val decisions =
            policy.resolveRefreshTargets(
                collectedKeywords =
                    listOf(
                        collectedKeyword("아이브", rank = 1),
                        collectedKeyword("뉴진스", rank = 2),
                        CollectedKeyword(word = "태그", category = "태그"),
                    ),
                existingKeywordsByWord = mapOf("아이브" to missingExplainKeyword),
                recentCompletedRuns = emptyList(),
                trendLogsByRunId = emptyMap(),
                pastAppearedKeywordIds = emptySet(),
            )

        assertEquals(
            listOf(
                KeywordExplainRefreshReason.MISSING_EXPLAIN,
                KeywordExplainRefreshReason.NEW_KEYWORD,
            ),
            decisions.map { it.reason },
        )
        assertEquals(listOf("아이브", "뉴진스"), decisions.map { it.keyword.word })
    }

    @Test
    fun `resolveRefreshTargets skips unchanged keyword with existing explain`() {
        val existingKeyword =
            keyword(
                id = 1,
                word = "아이브",
                currentRank = 2,
                explain = "기존 설명",
            )

        val decisions =
            policy.resolveRefreshTargets(
                collectedKeywords = listOf(collectedKeyword("아이브", rank = 2)),
                existingKeywordsByWord = mapOf("아이브" to existingKeyword),
                recentCompletedRuns =
                    listOf(
                        crawlRun(id = 2, startedAt = LocalDateTime.of(2026, 5, 8, 3, 0)),
                        crawlRun(id = 1, startedAt = LocalDateTime.of(2026, 5, 1, 3, 0)),
                    ),
                trendLogsByRunId =
                    mapOf(
                        1L to
                            listOf(
                                trendLog(crawlRunId = 1, keywordId = 1, rank = 2),
                            ),
                        2L to listOf(trendLog(crawlRunId = 2, keywordId = 1, rank = 2)),
                    ),
                pastAppearedKeywordIds = setOf(1L),
            )

        assertTrue(decisions.isEmpty())
    }

    @Test
    fun `resolveRefreshTargets selects trend event keywords`() {
        val firstContinued = keyword(id = 1, word = "2주연속", currentRank = 2, explain = "기존 설명")
        val longRunning = keyword(id = 2, word = "장기지속", currentRank = 3, explain = "기존 설명")
        val reEntry = keyword(id = 3, word = "재진입", currentRank = null, explain = "기존 설명")
        val rankSurged = keyword(id = 4, word = "급상승", currentRank = 7, explain = "기존 설명")

        val decisions =
            policy.resolveRefreshTargets(
                collectedKeywords =
                    listOf(
                        collectedKeyword("2주연속", rank = 2),
                        collectedKeyword("장기지속", rank = 3),
                        collectedKeyword("재진입", rank = 4),
                        collectedKeyword("급상승", rank = 2),
                    ),
                existingKeywordsByWord =
                    listOf(firstContinued, longRunning, reEntry, rankSurged).associateBy { it.word },
                recentCompletedRuns =
                    listOf(
                        crawlRun(id = 3, startedAt = LocalDateTime.of(2026, 5, 15, 3, 0)),
                        crawlRun(id = 2, startedAt = LocalDateTime.of(2026, 5, 8, 3, 0)),
                        crawlRun(id = 1, startedAt = LocalDateTime.of(2026, 5, 1, 3, 0)),
                    ),
                trendLogsByRunId =
                    mapOf(
                        1L to
                            listOf(
                                trendLog(crawlRunId = 1, keywordId = 2, rank = 3),
                            ),
                        2L to
                            listOf(
                                trendLog(crawlRunId = 2, keywordId = 2, rank = 3),
                                trendLog(crawlRunId = 2, keywordId = 3, rank = 5),
                            ),
                        3L to
                            listOf(
                                trendLog(crawlRunId = 3, keywordId = 1, rank = 2),
                                trendLog(crawlRunId = 3, keywordId = 2, rank = 3),
                                trendLog(crawlRunId = 3, keywordId = 4, rank = 7),
                            ),
                    ),
                pastAppearedKeywordIds = setOf(1L, 2L, 3L, 4L),
            )

        assertEquals(
            listOf(
                KeywordExplainRefreshReason.FIRST_CONTINUED,
                KeywordExplainRefreshReason.LONG_RUNNING,
                KeywordExplainRefreshReason.RE_ENTRY,
                KeywordExplainRefreshReason.RANK_SURGED,
            ),
            decisions.map { it.reason },
        )
        assertEquals(listOf(2, 4, 1, 2), decisions.map { it.consecutiveWeeks })
    }

    @Test
    fun `resolveRefreshTargets selects reentry when keyword appeared before recent run window`() {
        val reEntry = keyword(id = 1, word = "재진입", currentRank = null, explain = "기존 설명")

        val decisions =
            policy.resolveRefreshTargets(
                collectedKeywords = listOf(collectedKeyword("재진입", rank = 4)),
                existingKeywordsByWord = mapOf("재진입" to reEntry),
                recentCompletedRuns =
                    listOf(
                        crawlRun(id = 3, startedAt = LocalDateTime.of(2026, 5, 15, 3, 0)),
                        crawlRun(id = 2, startedAt = LocalDateTime.of(2026, 5, 8, 3, 0)),
                    ),
                trendLogsByRunId = emptyMap(),
                pastAppearedKeywordIds = setOf(1L),
            )

        assertEquals(listOf(KeywordExplainRefreshReason.RE_ENTRY), decisions.map { it.reason })
        assertEquals(listOf(1), decisions.map { it.consecutiveWeeks })
    }

    private fun collectedKeyword(
        word: String,
        rank: Int,
    ): CollectedKeyword =
        CollectedKeyword(
            word = word,
            currentRank = rank,
            trendScore = 100_000L,
        )

    private fun keyword(
        id: Long,
        word: String,
        currentRank: Int?,
        explain: String?,
    ): Keyword =
        Keyword(
            word = word,
            generation = Generation.TEEN,
            currentRank = currentRank,
            explain = explain,
        ).also { it.id = id }

    private fun crawlRun(
        id: Long,
        startedAt: LocalDateTime,
    ): TrendCrawlRun =
        TrendCrawlRun(
            generation = Generation.TEEN,
            status = TrendCrawlRunStatus.COMPLETED,
            startedAt = startedAt,
            completedAt = startedAt.plusMinutes(5),
        ).also { it.id = id }

    private fun trendLog(
        crawlRunId: Long,
        keywordId: Long,
        rank: Int?,
        recordedAt: LocalDateTime = LocalDateTime.of(2026, 5, 1, 3, 0),
    ): TrendLog =
        TrendLog(
            crawlRunId = crawlRunId,
            keywordId = keywordId,
            rank = rank,
            score = 100_000L,
        ).also { it.recordedAt = recordedAt }
}
