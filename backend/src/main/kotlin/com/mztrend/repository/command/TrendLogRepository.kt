package com.mztrend.repository.command

import com.mztrend.domain.TrendLog
import org.springframework.data.jpa.repository.JpaRepository

interface TrendLogRepository : JpaRepository<TrendLog, Long> {
    fun findAllByKeywordIdIn(keywordIds: Collection<Long>): List<TrendLog>

    fun findAllByCrawlRunIdIn(crawlRunIds: Collection<Long>): List<TrendLog>
}
