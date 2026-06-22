package com.mztrend.service.crawling.candidate

import com.mztrend.client.NaverDataLabTrendClient
import com.mztrend.client.dto.NaverKeywordGroup
import com.mztrend.client.dto.NaverSearchTrendRequest
import com.mztrend.client.dto.NaverSearchTrendResult
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.math.roundToLong

@Service
class NaverDataLabTrendScorer(
    private val naverDataLabTrendClient: NaverDataLabTrendClient,
    private val properties: ExternalApiProperties,
    private val clock: Clock = Clock.system(SEOUL_ZONE_ID),
) {
    fun score(candidates: List<TrendCandidate>): Map<Generation, List<ScoredTrendKeyword>> =
        Generation.entries.associateWith { generation -> score(candidates, generation) }

    fun score(
        candidates: List<TrendCandidate>,
        generation: Generation,
    ): List<ScoredTrendKeyword> {
        val targetCandidates = candidates.normalizeCandidates()
        if (targetCandidates.isEmpty()) return emptyList()

        val collectedAt = LocalDateTime.now(clock)
        val scoreContexts =
            buildKeywordChunks(targetCandidates)
                .flatMap { chunk -> requestAndScore(chunk, generation, collectedAt) }
                .distinctBy { it.candidate.word }
                .filter { it.rawMetrics.maxRatio >= properties.naver.minSearchRatio }

        val scoreComparator =
            compareByDescending<ScoredKeywordContext> { it.trendScore }
                .thenBy { it.candidate.rank }
                .thenBy { it.candidate.word }

        return scoreContexts
            .sortedWith(scoreComparator)
            .mapIndexed { index, context ->
                ScoredTrendKeyword(
                    generation = generation,
                    word = context.candidate.word,
                    rank = index + 1,
                    trendScore = context.trendScore,
                    averageRatio = context.rawMetrics.averageRatio,
                    maxRatio = context.rawMetrics.maxRatio,
                    source = context.candidate.source,
                    candidateScore = context.candidate.score,
                    collectedAt = collectedAt,
                    evidenceVideos = context.candidate.evidenceVideos,
                )
            }
    }

    private fun List<TrendCandidate>.normalizeCandidates(): List<TrendCandidate> =
        distinctBy { it.word }
            .sortedWith(compareBy<TrendCandidate> { it.rank }.thenByDescending { it.score })
            .take(properties.naver.maxCandidateCount)

    private fun buildKeywordChunks(candidates: List<TrendCandidate>): List<List<TrendCandidate>> {
        val maxKeywordGroupSize = properties.naver.maxKeywordGroupSize
        if (candidates.size <= maxKeywordGroupSize) return listOf(candidates)
        if (maxKeywordGroupSize == 1) return candidates.map { listOf(it) }

        val anchor = candidates.first()
        val chunkSize = maxKeywordGroupSize - 1

        return candidates
            .drop(1)
            .chunked(chunkSize)
            .map { chunk -> listOf(anchor) + chunk }
    }

    private fun requestAndScore(
        chunk: List<TrendCandidate>,
        generation: Generation,
        collectedAt: LocalDateTime,
    ): List<ScoredKeywordContext> {
        val response = naverDataLabTrendClient.searchTrend(toRequest(chunk, generation, collectedAt.toLocalDate()))
        val metrics =
            response.results
                .mapNotNull { result ->
                    val title = result.title?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
                    title to result.toMetrics()
                }
        val metricsByWord = metrics.toMap()

        val anchorMetrics = chunk.firstOrNull()?.word?.let { word -> metricsByWord[word] }

        return chunk.mapNotNull { candidate ->
            val rawMetrics = metricsByWord[candidate.word] ?: return@mapNotNull null
            val trendScore = rawMetrics.toTrendScore(anchorMetrics)

            ScoredKeywordContext(
                candidate = candidate,
                rawMetrics = rawMetrics,
                trendScore = trendScore,
            )
        }
    }

    private fun toRequest(
        candidates: List<TrendCandidate>,
        generation: Generation,
        collectedDate: LocalDate,
    ): NaverSearchTrendRequest {
        val endDate = collectedDate
        val startDate = endDate.minusDays(properties.naver.trendPeriodDays - 1)

        return NaverSearchTrendRequest(
            startDate = startDate.toString(),
            endDate = endDate.toString(),
            timeUnit = properties.naver.timeUnit,
            keywordGroups =
                candidates.map { candidate ->
                    NaverKeywordGroup(
                        groupName = candidate.word,
                        keywords = listOf(candidate.word),
                    )
                },
            device = properties.naver.device.takeIf { it.isNotBlank() },
            ages = generation.toNaverDataLabAges(),
        )
    }

    private fun NaverSearchTrendResult.toMetrics(): SearchRatioMetrics {
        val ratios = data.map { it.ratio.coerceAtLeast(0.0) }
        if (ratios.isEmpty()) return SearchRatioMetrics(averageRatio = 0.0, maxRatio = 0.0)

        return SearchRatioMetrics(
            averageRatio = ratios.average(),
            maxRatio = ratios.maxOrNull() ?: 0.0,
        )
    }

    private fun SearchRatioMetrics.toTrendScore(anchorMetrics: SearchRatioMetrics?): Long {
        val baseAverageRatio = averageRatio.toComparableRatio(anchorMetrics?.averageRatio)
        val baseMaxRatio = maxRatio.toComparableRatio(anchorMetrics?.maxRatio)

        return ((baseAverageRatio * AVERAGE_RATIO_WEIGHT) + (baseMaxRatio * MAX_RATIO_WEIGHT)).roundToLong()
    }

    private fun Double.toComparableRatio(anchorRatio: Double?): Double {
        if (anchorRatio == null || anchorRatio <= 0.0) return this

        return (this / anchorRatio) * ANCHOR_RATIO_BASE
    }

    private fun Generation.toNaverDataLabAges(): List<String> =
        when (this) {
            Generation.TEEN -> listOf("2")
            Generation.TWENTY -> listOf("3", "4")
        }

    private data class SearchRatioMetrics(
        val averageRatio: Double,
        val maxRatio: Double,
    )

    private data class ScoredKeywordContext(
        val candidate: TrendCandidate,
        val rawMetrics: SearchRatioMetrics,
        val trendScore: Long,
    )

    companion object {
        private val SEOUL_ZONE_ID = ZoneId.of("Asia/Seoul")
        private const val ANCHOR_RATIO_BASE = 100.0
        private const val AVERAGE_RATIO_WEIGHT = 70.0
        private const val MAX_RATIO_WEIGHT = 30.0
    }
}
