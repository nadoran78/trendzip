package com.mztrend.scheduler

import com.mztrend.common.logger
import com.mztrend.config.CrawlingSchedulerProperties
import com.mztrend.domain.Generation
import com.mztrend.service.TrendCrawlRunRecorder
import com.mztrend.service.TrendCrawlingService
import com.mztrend.service.crawling.TrendCrawlingBatchAssembler
import com.mztrend.service.crawling.candidate.NaverDataLabTrendScorer
import com.mztrend.service.crawling.candidate.TrendCandidate
import com.mztrend.service.crawling.candidate.TrendCandidateSource
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class TrendCrawlingScheduler(
    private val candidateSources: List<TrendCandidateSource>,
    private val trendScorer: NaverDataLabTrendScorer,
    private val batchAssembler: TrendCrawlingBatchAssembler,
    private val trendCrawlingService: TrendCrawlingService,
    private val trendCrawlRunRecorder: TrendCrawlRunRecorder,
    private val properties: CrawlingSchedulerProperties,
) {
    @Scheduled(
        cron = "\${app.crawling-scheduler.cron:0 0 3 * * MON}",
        zone = "\${app.crawling-scheduler.zone:Asia/Seoul}",
    )
    fun crawlTrends() {
        if (!properties.enabled) {
            log.info("Skip trend crawling scheduler because it is disabled.")
            return
        }

        val candidates =
            runCatching {
                collectCandidates()
            }.getOrElse { exception ->
                failAllGenerations("candidate collection failed", exception)
                return
            }
        if (candidates.isEmpty()) {
            failAllGenerations("collected candidates are empty")
            return
        }

        Generation.entries.forEach { generation -> crawlGeneration(generation, candidates) }
    }

    private fun crawlGeneration(
        generation: Generation,
        candidates: List<TrendCandidate>,
    ) {
        val crawlRun = trendCrawlRunRecorder.start(generation)

        try {
            val scoredKeywords = trendScorer.score(candidates, generation)
            if (scoredKeywords.isEmpty()) {
                trendCrawlRunRecorder.fail(crawlRun)
                log.warn(
                    "Trend crawling failed because scored keywords are empty. generation={}, candidateCount={}",
                    generation,
                    candidates.size,
                )
                return
            }

            val batch = batchAssembler.assemble(generation, scoredKeywords)
            val result = trendCrawlingService.saveCollectedTrends(requireNotNull(crawlRun.id), batch)
            trendCrawlRunRecorder.complete(crawlRun)
            log.info(
                "Trend crawling completed. generation={}, candidates={}, scoredKeywords={}, keywords={}, trendLogs={}, videos={}, feedItems={}",
                generation,
                candidates.size,
                scoredKeywords.size,
                result.keywordCount,
                result.trendLogCount,
                result.videoCount,
                result.feedItemCount,
            )
        } catch (exception: Exception) {
            trendCrawlRunRecorder.fail(crawlRun)
            log.warn(
                "Trend crawling failed for generation. generation={}, candidateCount={}, message={}",
                generation,
                candidates.size,
                exception.message,
                exception,
            )
        }
    }

    private fun collectCandidates(): List<TrendCandidate> =
        candidateSources.flatMap { source ->
            runCatching {
                source.collectCandidates()
            }.getOrElse { exception ->
                log.warn(
                    "Trend candidate source collection failed. source={}, message={}",
                    source::class.simpleName,
                    exception.message,
                    exception,
                )
                throw exception
            }
        }

    private fun failAllGenerations(
        reason: String,
        exception: Throwable? = null,
    ) {
        Generation.entries.forEach { generation ->
            val crawlRun = trendCrawlRunRecorder.start(generation)
            trendCrawlRunRecorder.fail(crawlRun)
        }
        if (exception == null) {
            log.warn("Trend crawling failed before generation processing. reason={}", reason)
        } else {
            log.warn(
                "Trend crawling failed before generation processing. reason={}, message={}",
                reason,
                exception.message,
                exception,
            )
        }
    }

    companion object {
        private val log = logger<TrendCrawlingScheduler>()
    }
}
