package com.mztrend.service

import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendCrawlRunRepository
import com.mztrend.repository.command.TrendLogLookupRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedTrendBatchValidator
import com.mztrend.service.crawling.KeywordExplainRefreshAppender
import com.mztrend.service.crawling.KeywordExplainRefreshPolicy
import com.mztrend.service.crawling.TrendCrawlingResult
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import kotlin.math.max

@Service
class TrendCrawlingService(
    private val keywordRepository: KeywordRepository,
    private val trendLogRepository: TrendLogRepository,
    private val trendLogLookupRepository: TrendLogLookupRepository,
    private val trendCrawlRunRepository: TrendCrawlRunRepository,
    private val trendCrawlRunRecorder: TrendCrawlRunRecorder,
    private val trendCrawlingPersistenceService: TrendCrawlingPersistenceService,
    private val collectedTrendBatchValidator: CollectedTrendBatchValidator,
    private val keywordExplainRefreshPolicy: KeywordExplainRefreshPolicy,
    private val keywordExplainRefreshAppender: KeywordExplainRefreshAppender,
    private val properties: ExternalApiProperties,
) {
    fun saveCollectedTrends(batch: CollectedTrendBatch): TrendCrawlingResult {
        collectedTrendBatchValidator.validate(batch)
        val crawlRun = trendCrawlRunRecorder.start(batch.generation)

        return runCatching {
            val result = saveCollectedTrends(requireNotNull(crawlRun.id), batch)
            trendCrawlRunRecorder.complete(crawlRun)
            result
        }.getOrElse { exception ->
            trendCrawlRunRecorder.fail(crawlRun)
            throw exception
        }
    }

    fun saveCollectedTrends(
        crawlRunId: Long,
        batch: CollectedTrendBatch,
    ): TrendCrawlingResult {
        collectedTrendBatchValidator.validate(batch)
        val batchWithExplains = appendKeywordExplains(batch)

        return trendCrawlingPersistenceService.saveCollectedTrends(
            crawlRunId = crawlRunId,
            batch = batchWithExplains,
        )
    }

    private fun appendKeywordExplains(batch: CollectedTrendBatch): CollectedTrendBatch {
        val keywordWords = batch.keywords.map { it.word }.distinct()
        if (keywordWords.isEmpty()) return batch

        val existingKeywordsByWord =
            keywordRepository
                .findAllByGenerationAndWordIn(batch.generation, keywordWords)
                .associateBy { it.word }
        val recentCompletedRuns = findRecentCompletedRuns(batch.generation)
        val trendLogsByRunId = findTrendLogsByRunId(recentCompletedRuns)
        val pastAppearedKeywordIds = findPastRankedKeywordIds(existingKeywordsByWord.values)
        val refreshDecisions =
            keywordExplainRefreshPolicy.resolveRefreshTargets(
                collectedKeywords = batch.keywords,
                existingKeywordsByWord = existingKeywordsByWord,
                recentCompletedRuns = recentCompletedRuns,
                trendLogsByRunId = trendLogsByRunId,
                pastAppearedKeywordIds = pastAppearedKeywordIds,
            )

        return keywordExplainRefreshAppender.appendExplains(batch, refreshDecisions)
    }

    private fun findRecentCompletedRuns(generation: Generation): List<TrendCrawlRun> =
        trendCrawlRunRepository.findAllByGenerationAndStatusOrderByStartedAtDesc(
            generation = generation,
            status = TrendCrawlRunStatus.COMPLETED,
            pageable = PageRequest.of(0, max(2, properties.gemini.longRunningWeeks - 1)),
        )

    private fun findTrendLogsByRunId(recentCompletedRuns: List<TrendCrawlRun>) =
        recentCompletedRuns
            .mapNotNull { it.id }
            .takeIf { it.isNotEmpty() }
            ?.let { crawlRunIds ->
                trendLogRepository
                    .findAllByCrawlRunIdIn(crawlRunIds)
                    .groupBy { it.crawlRunId }
            }
            ?: emptyMap()

    private fun findPastRankedKeywordIds(existingKeywords: Collection<Keyword>): Set<Long> {
        val keywordIds = existingKeywords.mapNotNull { it.id }
        if (keywordIds.isEmpty()) return emptySet()

        return trendLogLookupRepository.findRankedKeywordIdsInCompletedRuns(keywordIds)
    }
}
