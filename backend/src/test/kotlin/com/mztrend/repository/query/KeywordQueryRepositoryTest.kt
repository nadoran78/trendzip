package com.mztrend.repository.query

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.jooq.Tables.KEYWORDS
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import kotlin.test.assertEquals

@SpringBootTest
@ActiveProfiles("test")
class KeywordQueryRepositoryTest {
    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var keywordQueryRepository: KeywordQueryRepository

    @BeforeEach
    fun setUp() {
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
            .execute()
    }

    @Test
    fun `findByGeneration returns keywords ordered by rank`() {
        val results = keywordQueryRepository.findByGeneration(Generation.TEEN)

        assertEquals(listOf("teen-first", "teen-second"), results.map { it.word })
        assertEquals(listOf(1, 2), results.map { it.rank })
        assertEquals(listOf("game", "music"), results.map { it.category })
        assertEquals(listOf(1_200_000L, 982_000L), results.map { it.trendScore })
        assertEquals(listOf(RankTrend.UP, RankTrend.DOWN), results.map { it.rankTrend })
        assertEquals(listOf(4, 1), results.map { it.rankDelta })
    }
}
