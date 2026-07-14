package com.mztrend.repository.command

import com.mztrend.domain.Generation
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface TrendCrawlRunRepository : JpaRepository<TrendCrawlRun, Long> {
    fun findAllByGenerationAndStatusOrderByStartedAtDesc(
        generation: Generation,
        status: TrendCrawlRunStatus,
        pageable: Pageable,
    ): List<TrendCrawlRun>
}
