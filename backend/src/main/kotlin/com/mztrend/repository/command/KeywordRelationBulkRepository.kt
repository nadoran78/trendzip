package com.mztrend.repository.command

import com.mztrend.jooq.Tables.KEYWORD_RELATIONS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
class KeywordRelationBulkRepository(
    private val dsl: DSLContext,
) {
    fun deactivateActiveByKeywordIdIn(
        keywordIds: Collection<Long>,
        deactivatedAt: LocalDateTime,
    ): Int {
        if (keywordIds.isEmpty()) return 0

        return dsl
            .update(KEYWORD_RELATIONS)
            .set(KEYWORD_RELATIONS.IS_ACTIVE, false)
            .set(KEYWORD_RELATIONS.UPDATED_AT, deactivatedAt)
            .set(KEYWORD_RELATIONS.DEACTIVATED_AT, deactivatedAt)
            .where(KEYWORD_RELATIONS.KEYWORD_ID.`in`(keywordIds))
            .and(KEYWORD_RELATIONS.IS_ACTIVE.isTrue)
            .execute()
    }
}
