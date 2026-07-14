package com.mztrend.service.crawling

import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Keyword
import com.mztrend.domain.TrendCrawlRun
import com.mztrend.domain.TrendLog
import org.springframework.stereotype.Component

@Component
class KeywordExplainRefreshPolicy(
    private val properties: ExternalApiProperties,
) {
    fun resolveRefreshTargets(
        collectedKeywords: List<CollectedKeyword>,
        existingKeywordsByWord: Map<String, Keyword>,
        recentCompletedRuns: List<TrendCrawlRun>,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
        pastAppearedKeywordIds: Set<Long>,
    ): List<KeywordExplainRefreshDecision> =
        collectedKeywords
            .distinctBy { it.word }
            .mapNotNull { collectedKeyword ->
                val existingKeyword = existingKeywordsByWord[collectedKeyword.word]
                resolveRefreshTarget(
                    collectedKeyword,
                    existingKeyword,
                    recentCompletedRuns,
                    trendLogsByRunId,
                    pastAppearedKeywordIds,
                )
            }.take(properties.gemini.maxExplainKeywordCount)

    private fun resolveRefreshTarget(
        collectedKeyword: CollectedKeyword,
        existingKeyword: Keyword?,
        recentCompletedRuns: List<TrendCrawlRun>,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
        pastAppearedKeywordIds: Set<Long>,
    ): KeywordExplainRefreshDecision? {
        if (!collectedKeyword.isRankedTrendKeyword()) return null
        if (!collectedKeyword.explain.isNullOrBlank()) return null

        val currentRank = collectedKeyword.currentRank
        val keywordId = existingKeyword?.id
        val previousRun = recentCompletedRuns.firstOrNull()
        val previousRank = previousRun?.findRank(keywordId, trendLogsByRunId)
        val consecutiveWeeks = resolveConsecutiveWeeks(currentRank, keywordId, recentCompletedRuns, trendLogsByRunId)
        val reason =
            when {
                existingKeyword == null -> KeywordExplainRefreshReason.NEW_KEYWORD
                existingKeyword.explain.isNullOrBlank() -> KeywordExplainRefreshReason.MISSING_EXPLAIN
                isReEntry(keywordId, currentRank, recentCompletedRuns, trendLogsByRunId, pastAppearedKeywordIds) ->
                    KeywordExplainRefreshReason.RE_ENTRY
                isRankSurged(previousRank, currentRank) -> KeywordExplainRefreshReason.RANK_SURGED
                consecutiveWeeks == FIRST_CONTINUED_WEEKS -> KeywordExplainRefreshReason.FIRST_CONTINUED
                consecutiveWeeks == properties.gemini.longRunningWeeks -> KeywordExplainRefreshReason.LONG_RUNNING
                else -> return null
            }

        return KeywordExplainRefreshDecision(
            keyword = collectedKeyword,
            reason = reason,
            previousExplain = existingKeyword?.explain?.takeIf { it.isNotBlank() },
            previousRank = previousRank,
            consecutiveWeeks = consecutiveWeeks,
        )
    }

    private fun CollectedKeyword.isRankedTrendKeyword(): Boolean = currentRank != null || trendScore != null

    private fun resolveConsecutiveWeeks(
        currentRank: Int?,
        keywordId: Long?,
        recentCompletedRuns: List<TrendCrawlRun>,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
    ): Int {
        if (currentRank == null) return 1
        if (keywordId == null) return 1

        return recentCompletedRuns
            .takeWhile { run -> run.containsKeyword(keywordId, trendLogsByRunId) }
            .count() + 1
    }

    private fun isReEntry(
        keywordId: Long?,
        currentRank: Int?,
        recentCompletedRuns: List<TrendCrawlRun>,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
        pastAppearedKeywordIds: Set<Long>,
    ): Boolean {
        if (keywordId == null || currentRank == null) return false

        val previousRun = recentCompletedRuns.firstOrNull() ?: return false
        val existedInPreviousRun = previousRun.containsKeyword(keywordId, trendLogsByRunId)

        return !existedInPreviousRun && pastAppearedKeywordIds.contains(keywordId)
    }

    private fun TrendCrawlRun.containsKeyword(
        keywordId: Long,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
    ): Boolean = findRank(keywordId, trendLogsByRunId) != null

    private fun TrendCrawlRun.findRank(
        keywordId: Long?,
        trendLogsByRunId: Map<Long, List<TrendLog>>,
    ): Int? {
        if (keywordId == null) return null

        return id
            ?.let { trendLogsByRunId[it] }
            ?.firstOrNull { it.keywordId == keywordId && it.rank != null }
            ?.rank
    }

    private fun isRankSurged(
        previousRank: Int?,
        currentRank: Int?,
    ): Boolean =
        previousRank != null &&
            currentRank != null &&
            previousRank - currentRank >= properties.gemini.rankSurgeThreshold

    companion object {
        private const val FIRST_CONTINUED_WEEKS = 2
    }
}
