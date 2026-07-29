package com.mztrend.repository.query

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.jooq.Tables.TREND_CRAWL_RUNS
import com.mztrend.jooq.Tables.TREND_LOGS
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

@SpringBootTest
@ActiveProfiles("test")
class KeywordQueryRepositoryTest {
    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var keywordQueryRepository: KeywordQueryRepository

    @BeforeEach
    fun setUp() {
        dsl.deleteFrom(TREND_LOGS).execute()
        dsl.deleteFrom(TREND_CRAWL_RUNS).execute()
        dsl.deleteFrom(KEYWORDS).execute()

        dsl
            .insertInto(
                KEYWORDS,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.CATEGORY,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.TREND_SCORE,
                KEYWORDS.RANK_TREND,
                KEYWORDS.RANK_DELTA,
            ).values(1L, "teen-second", Generation.TEEN.name, "music", 2, 982_000L, RankTrend.DOWN.name, 1)
            .values(2L, "teen-first", Generation.TEEN.name, "game", 1, 1_200_000L, RankTrend.UP.name, 4)
            .values(3L, "twenty-first", Generation.TWENTY.name, "beauty", 1, 744_000L, RankTrend.NEW.name, null)
            .values(4L, "teen-stale", Generation.TEEN.name, "sports", 1, 9_999_999L, RankTrend.NEW.name, null)
            .execute()

        dsl
            .insertInto(
                TREND_CRAWL_RUNS,
                TREND_CRAWL_RUNS.ID,
                TREND_CRAWL_RUNS.GENERATION,
                TREND_CRAWL_RUNS.STATUS,
                TREND_CRAWL_RUNS.STARTED_AT,
                TREND_CRAWL_RUNS.COMPLETED_AT,
            ).values(
                100L,
                Generation.TEEN.name,
                TrendCrawlRunStatus.COMPLETED.name,
                LocalDateTime.of(2026, 7, 25, 3, 0),
                LocalDateTime.of(2026, 7, 25, 3, 5),
            ).values(
                101L,
                Generation.TEEN.name,
                TrendCrawlRunStatus.COMPLETED.name,
                LocalDateTime.of(2026, 7, 26, 3, 0),
                LocalDateTime.of(2026, 7, 26, 3, 5),
            ).values(
                102L,
                Generation.TEEN.name,
                TrendCrawlRunStatus.RUNNING.name,
                LocalDateTime.of(2026, 7, 27, 3, 0),
                null,
            ).values(
                103L,
                Generation.TWENTY.name,
                TrendCrawlRunStatus.COMPLETED.name,
                LocalDateTime.of(2026, 7, 26, 3, 10),
                LocalDateTime.of(2026, 7, 26, 3, 15),
            ).execute()

        dsl
            .insertInto(
                TREND_LOGS,
                TREND_LOGS.ID,
                TREND_LOGS.CRAWL_RUN_ID,
                TREND_LOGS.KEYWORD_ID,
                TREND_LOGS.RANK,
                TREND_LOGS.SCORE,
            ).values(1000L, 100L, 4L, 1, 9_999_999L)
            .values(1001L, 101L, 2L, 1, 1_200_000L)
            .values(1002L, 101L, 1L, 2, 982_000L)
            .values(1003L, 102L, 4L, 1, 12_000_000L)
            .values(1004L, 103L, 3L, 1, 744_000L)
            .execute()
    }

    @Test
    fun `findByGeneration returns only keywords from latest completed crawl run ordered by rank`() {
        val results = keywordQueryRepository.findByGeneration(Generation.TEEN)

        assertEquals(listOf("teen-first", "teen-second"), results.map { it.word })
        assertEquals(listOf(1, 2), results.map { it.rank })
        assertEquals(listOf("game", "music"), results.map { it.category })
        assertEquals(listOf(1_200_000L, 982_000L), results.map { it.trendScore })
        assertEquals(listOf(RankTrend.UP, RankTrend.DOWN), results.map { it.rankTrend })
        assertEquals(listOf(4, 1), results.map { it.rankDelta })
    }

    @Test
    fun `findByGeneration returns empty list when generation has no completed crawl run`() {
        dsl
            .update(TREND_CRAWL_RUNS)
            .set(TREND_CRAWL_RUNS.STATUS, TrendCrawlRunStatus.RUNNING.name)
            .setNull(TREND_CRAWL_RUNS.COMPLETED_AT)
            .where(TREND_CRAWL_RUNS.GENERATION.eq(Generation.TWENTY.name))
            .execute()

        assertEquals(emptyList(), keywordQueryRepository.findByGeneration(Generation.TWENTY))
    }

    @Test
    fun `findExplainById returns rank and score from latest completed crawl run`() {
        dsl
            .update(KEYWORDS)
            .set(KEYWORDS.CURRENT_RANK, 7)
            .set(KEYWORDS.TREND_SCORE, 7_000_000L)
            .where(KEYWORDS.ID.eq(2L))
            .execute()
        dsl
            .update(TREND_CRAWL_RUNS)
            .set(TREND_CRAWL_RUNS.STATUS, TrendCrawlRunStatus.FAILED.name)
            .set(TREND_CRAWL_RUNS.COMPLETED_AT, LocalDateTime.of(2026, 7, 27, 3, 5))
            .where(TREND_CRAWL_RUNS.ID.eq(102L))
            .execute()
        dsl
            .insertInto(
                TREND_LOGS,
                TREND_LOGS.ID,
                TREND_LOGS.CRAWL_RUN_ID,
                TREND_LOGS.KEYWORD_ID,
                TREND_LOGS.RANK,
                TREND_LOGS.SCORE,
            ).values(1005L, 102L, 2L, 7, 7_000_000L)
            .execute()

        val result = assertNotNull(keywordQueryRepository.findExplainById(2L))

        assertEquals(1, result.rank)
        assertEquals(1_200_000L, result.trendScore)
        assertEquals(RankTrend.UP, result.rankTrend)
        assertEquals(4, result.rankDelta)
    }

    @Test
    fun `findExplainById returns null rank and score when keyword is absent from latest completed crawl run`() {
        val result = assertNotNull(keywordQueryRepository.findExplainById(4L))

        assertNull(result.rank)
        assertNull(result.trendScore)
    }

    @Test
    fun `findExplainById returns null for unknown keyword id`() {
        assertNull(keywordQueryRepository.findExplainById(999L))
    }
}
