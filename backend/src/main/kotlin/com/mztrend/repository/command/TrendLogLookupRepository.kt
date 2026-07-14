package com.mztrend.repository.command

import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.jooq.Tables.TREND_CRAWL_RUNS
import com.mztrend.jooq.Tables.TREND_LOGS
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class TrendLogLookupRepository(
    private val dsl: DSLContext,
) {
    fun findRankedKeywordIdsInCompletedRuns(keywordIds: Collection<Long>): Set<Long> {
        if (keywordIds.isEmpty()) return emptySet()

        return dsl
            .selectDistinct(TREND_LOGS.KEYWORD_ID)
            .from(TREND_LOGS)
            .join(TREND_CRAWL_RUNS)
            .on(TREND_CRAWL_RUNS.ID.eq(TREND_LOGS.CRAWL_RUN_ID))
            .where(TREND_LOGS.KEYWORD_ID.`in`(keywordIds))
            .and(TREND_LOGS.RANK.isNotNull)
            .and(TREND_CRAWL_RUNS.STATUS.eq(TrendCrawlRunStatus.COMPLETED.name))
            .fetchSet(TREND_LOGS.KEYWORD_ID)
    }
}
