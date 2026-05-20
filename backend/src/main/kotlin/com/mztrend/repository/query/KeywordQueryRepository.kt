package com.mztrend.repository.query

import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.repository.query.dto.KeywordSummaryQueryResult
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class KeywordQueryRepository(
    private val dsl: DSLContext,
) {
    fun findByGeneration(generation: Generation): List<KeywordSummaryQueryResult> =
        dsl
            .select(
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.CATEGORY,
                KEYWORDS.TREND_SCORE,
                KEYWORDS.RANK_TREND,
                KEYWORDS.RANK_DELTA,
            ).from(KEYWORDS)
            .where(KEYWORDS.GENERATION.eq(generation.name))
            .orderBy(KEYWORDS.CURRENT_RANK.asc().nullsLast(), KEYWORDS.ID.asc())
            .fetch { record ->
                KeywordSummaryQueryResult(
                    id = record.get(KEYWORDS.ID),
                    word = record.get(KEYWORDS.WORD),
                    rank = record.get(KEYWORDS.CURRENT_RANK),
                    category = record.get(KEYWORDS.CATEGORY),
                    trendScore = record.get(KEYWORDS.TREND_SCORE),
                    rankTrend = record.get(KEYWORDS.RANK_TREND)?.let(RankTrend::valueOf),
                    rankDelta = record.get(KEYWORDS.RANK_DELTA),
                )
            }
}
