package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.repository.command.TrendCrawlRunRepository
import org.springframework.cache.annotation.CacheEvict
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

@Service
@Transactional(propagation = Propagation.REQUIRES_NEW)
class TrendCrawlRunRecorder(
    private val trendCrawlRunRepository: TrendCrawlRunRepository,
    private val clock: Clock,
) {
    fun start(generation: Generation): TrendCrawlRun =
        trendCrawlRunRepository.save(
            TrendCrawlRun(
                generation = generation,
                status = TrendCrawlRunStatus.RUNNING,
                startedAt = LocalDateTime.now(clock),
            ),
        )

    @CacheEvict(cacheNames = [CacheNames.KEYWORDS], allEntries = true)
    fun complete(crawlRun: TrendCrawlRun) {
        crawlRun.status = TrendCrawlRunStatus.COMPLETED
        crawlRun.completedAt = LocalDateTime.now(clock)
        trendCrawlRunRepository.save(crawlRun)
    }

    fun fail(crawlRun: TrendCrawlRun) {
        crawlRun.status = TrendCrawlRunStatus.FAILED
        crawlRun.completedAt = LocalDateTime.now(clock)
        trendCrawlRunRepository.save(crawlRun)
    }
}
