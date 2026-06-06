package com.mztrend.scheduler

import com.mztrend.config.CrawlingSchedulerProperties
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.service.TrendCrawlRunRecorder
import com.mztrend.service.TrendCrawlingService
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.TrendCrawlingBatchAssembler
import com.mztrend.service.crawling.TrendCrawlingResult
import com.mztrend.service.crawling.candidate.NaverDataLabTrendScorer
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import com.mztrend.service.crawling.candidate.TrendCandidate
import com.mztrend.service.crawling.candidate.TrendCandidateSource
import com.mztrend.service.crawling.candidate.TrendCandidateSourceType
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.time.LocalDateTime
import kotlin.test.assertEquals

class TrendCrawlingSchedulerTest {
    private val trendScorer = Mockito.mock(NaverDataLabTrendScorer::class.java)
    private val batchAssembler = Mockito.mock(TrendCrawlingBatchAssembler::class.java)
    private val trendCrawlingService = Mockito.mock(TrendCrawlingService::class.java)
    private val trendCrawlRunRecorder = Mockito.mock(TrendCrawlRunRecorder::class.java)
    private var crawlRunIdSequence = 1L

    @Test
    fun `crawlTrends skips all work when disabled`() {
        val source = FakeTrendCandidateSource(listOf(candidate("아이브")))
        val scheduler = scheduler(enabled = false, candidateSources = listOf(source))

        scheduler.crawlTrends()

        assertEquals(0, source.callCount)
        Mockito.verifyNoInteractions(trendScorer, batchAssembler, trendCrawlingService, trendCrawlRunRecorder)
    }

    @Test
    fun `crawlTrends marks runs failed and skips saving when candidates are empty`() {
        val source = FakeTrendCandidateSource(emptyList())
        val crawlRuns = stubCrawlRuns()
        val scheduler = scheduler(candidateSources = listOf(source))

        scheduler.crawlTrends()

        assertEquals(1, source.callCount)
        verifyFailed(crawlRuns)
        Mockito.verifyNoInteractions(trendScorer, batchAssembler, trendCrawlingService)
    }

    @Test
    fun `crawlTrends marks runs failed and skips saving when candidate collection fails`() {
        val source = FakeTrendCandidateSource(exception = IllegalStateException("source failed"))
        val crawlRuns = stubCrawlRuns()
        val scheduler = scheduler(candidateSources = listOf(source))

        scheduler.crawlTrends()

        assertEquals(1, source.callCount)
        verifyFailed(crawlRuns)
        Mockito.verifyNoInteractions(trendScorer, batchAssembler, trendCrawlingService)
    }

    @Test
    fun `crawlTrends continues next generation when one generation fails`() {
        val candidates = listOf(candidate("아이브"))
        val twentyKeywords = listOf(scoredKeyword(Generation.TWENTY, "퇴근 후 루틴"))
        val twentyBatch = batch(Generation.TWENTY)
        val crawlRuns = stubCrawlRuns()
        val twentyRun = requireNotNull(crawlRuns[Generation.TWENTY])
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TEEN))
            .thenThrow(IllegalStateException("teen failed"))
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TWENTY))
            .thenReturn(twentyKeywords)
        Mockito
            .`when`(batchAssembler.assemble(Generation.TWENTY, twentyKeywords))
            .thenReturn(twentyBatch)
        Mockito
            .`when`(trendCrawlingService.saveCollectedTrends(requireNotNull(twentyRun.id), twentyBatch))
            .thenReturn(result())

        val scheduler = scheduler(candidateSources = listOf(FakeTrendCandidateSource(candidates)))

        scheduler.crawlTrends()

        Mockito.verify(trendCrawlRunRecorder).fail(requireNotNull(crawlRuns[Generation.TEEN]))
        Mockito.verify(trendCrawlRunRecorder).complete(twentyRun)
        Mockito.verify(trendCrawlingService).saveCollectedTrends(requireNotNull(twentyRun.id), twentyBatch)
        Mockito.verifyNoMoreInteractions(trendCrawlingService)
    }

    @Test
    fun `crawlTrends marks run failed when scored keywords are empty`() {
        val candidates = listOf(candidate("아이브"))
        val crawlRuns = stubCrawlRuns()
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TEEN))
            .thenReturn(emptyList())
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TWENTY))
            .thenReturn(emptyList())

        val scheduler = scheduler(candidateSources = listOf(FakeTrendCandidateSource(candidates)))

        scheduler.crawlTrends()

        verifyFailed(crawlRuns)
        Mockito.verifyNoInteractions(batchAssembler, trendCrawlingService)
    }

    @Test
    fun `crawlTrends saves collected trends for each generation`() {
        val candidates = listOf(candidate("아이브"))
        val teenKeywords = listOf(scoredKeyword(Generation.TEEN, "아이브"))
        val twentyKeywords = listOf(scoredKeyword(Generation.TWENTY, "퇴근 후 루틴"))
        val teenBatch = batch(Generation.TEEN)
        val twentyBatch = batch(Generation.TWENTY)
        val crawlRuns = stubCrawlRuns()
        val teenRun = requireNotNull(crawlRuns[Generation.TEEN])
        val twentyRun = requireNotNull(crawlRuns[Generation.TWENTY])
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TEEN))
            .thenReturn(teenKeywords)
        Mockito
            .`when`(trendScorer.score(candidates, Generation.TWENTY))
            .thenReturn(twentyKeywords)
        Mockito
            .`when`(batchAssembler.assemble(Generation.TEEN, teenKeywords))
            .thenReturn(teenBatch)
        Mockito
            .`when`(batchAssembler.assemble(Generation.TWENTY, twentyKeywords))
            .thenReturn(twentyBatch)
        Mockito
            .`when`(trendCrawlingService.saveCollectedTrends(requireNotNull(teenRun.id), teenBatch))
            .thenReturn(result())
        Mockito
            .`when`(trendCrawlingService.saveCollectedTrends(requireNotNull(twentyRun.id), twentyBatch))
            .thenReturn(result())

        val source = FakeTrendCandidateSource(candidates)
        val scheduler = scheduler(candidateSources = listOf(source))

        scheduler.crawlTrends()

        assertEquals(1, source.callCount)
        Mockito.verify(trendCrawlRunRecorder).complete(teenRun)
        Mockito.verify(trendCrawlRunRecorder).complete(twentyRun)
        Mockito.verify(trendCrawlingService).saveCollectedTrends(requireNotNull(teenRun.id), teenBatch)
        Mockito.verify(trendCrawlingService).saveCollectedTrends(requireNotNull(twentyRun.id), twentyBatch)
    }

    private fun scheduler(
        enabled: Boolean = true,
        candidateSources: List<TrendCandidateSource>,
    ): TrendCrawlingScheduler =
        TrendCrawlingScheduler(
            candidateSources = candidateSources,
            trendScorer = trendScorer,
            batchAssembler = batchAssembler,
            trendCrawlingService = trendCrawlingService,
            trendCrawlRunRecorder = trendCrawlRunRecorder,
            properties = CrawlingSchedulerProperties(enabled = enabled),
        )

    private fun stubCrawlRuns(): Map<Generation, TrendCrawlRun> {
        val crawlRuns = Generation.entries.associateWith { generation -> crawlRun(generation) }
        crawlRuns.forEach { (generation, crawlRun) ->
            Mockito.`when`(trendCrawlRunRecorder.start(generation)).thenReturn(crawlRun)
        }
        return crawlRuns
    }

    private fun verifyFailed(crawlRuns: Map<Generation, TrendCrawlRun>) {
        Generation.entries.forEach { generation ->
            Mockito.verify(trendCrawlRunRecorder).fail(requireNotNull(crawlRuns[generation]))
        }
    }

    private fun crawlRun(generation: Generation): TrendCrawlRun =
        TrendCrawlRun(
            generation = generation,
            status = TrendCrawlRunStatus.RUNNING,
            startedAt = COLLECTED_AT,
        ).also { it.id = crawlRunIdSequence++ }

    private fun candidate(word: String): TrendCandidate =
        TrendCandidate(
            word = word,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            rank = 1,
            score = 1_000L,
            evidenceCount = 1,
            totalViewCount = 100_000L,
            collectedAt = COLLECTED_AT,
        )

    private fun scoredKeyword(
        generation: Generation,
        word: String,
    ): ScoredTrendKeyword =
        ScoredTrendKeyword(
            generation = generation,
            word = word,
            rank = 1,
            trendScore = 100_000L,
            averageRatio = 50.0,
            maxRatio = 100.0,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            candidateScore = 1_000L,
            collectedAt = COLLECTED_AT,
        )

    private fun batch(generation: Generation): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = generation,
            keywords = emptyList(),
            videos = emptyList(),
            feedItems = emptyList(),
        )

    private fun result(): TrendCrawlingResult =
        TrendCrawlingResult(
            keywordCount = 1,
            trendLogCount = 1,
            videoCount = 1,
            feedItemCount = 1,
            videoKeywordCount = 1,
            keywordRelationCount = 0,
        )

    private class FakeTrendCandidateSource(
        private val candidates: List<TrendCandidate> = emptyList(),
        private val exception: RuntimeException? = null,
    ) : TrendCandidateSource {
        var callCount: Int = 0
            private set

        override fun collectCandidates(): List<TrendCandidate> {
            callCount += 1
            exception?.let { throw it }
            return candidates
        }
    }

    companion object {
        private val COLLECTED_AT = LocalDateTime.of(2026, 6, 1, 3, 0)
    }
}
