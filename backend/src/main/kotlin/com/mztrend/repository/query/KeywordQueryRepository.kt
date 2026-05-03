package com.mztrend.repository.query

import com.mztrend.domain.Generation
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
                KEYWORDS.RANK,
                KEYWORDS.CATEGORY,
            ).from(KEYWORDS)
            .where(KEYWORDS.GENERATION.eq(generation.name))
            .orderBy(KEYWORDS.RANK.asc().nullsLast(), KEYWORDS.ID.asc())
            .fetch { record ->
                KeywordSummaryQueryResult(
                    id = record.get(KEYWORDS.ID),
                    word = record.get(KEYWORDS.WORD),
                    rank = record.get(KEYWORDS.RANK),
                    category = record.get(KEYWORDS.CATEGORY),
                )
            }
}
