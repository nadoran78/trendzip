package com.mztrend.service.crawling

import com.mztrend.client.GeminiRateLimitGuard
import com.mztrend.common.logger
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDateTime

@Service
class KeywordExplainRefreshAppender(
    private val keywordExplainGenerator: KeywordExplainGenerator,
    private val keywordExplainValidator: KeywordExplainValidator,
    private val geminiRateLimitGuard: GeminiRateLimitGuard,
    private val clock: Clock,
) {
    fun appendExplains(
        batch: CollectedTrendBatch,
        refreshDecisions: List<KeywordExplainRefreshDecision>,
    ): CollectedTrendBatch {
        if (refreshDecisions.isEmpty()) return batch

        val videosById = batch.videos.associateBy { it.youtubeVideoId }
        val videoIdsByKeyword = batch.videoIdsByKeyword()
        val explainedAt = LocalDateTime.now(clock)
        val explainsByWord =
            refreshDecisions
                .mapNotNull { decision ->
                    val videos =
                        videoIdsByKeyword[decision.keyword.word]
                            ?.mapNotNull(videosById::get)
                            ?: emptyList()

                    generateExplain(batch, decision, videos, explainedAt)
                }.toMap()

        if (explainsByWord.isEmpty()) return batch

        return batch.copy(
            keywords =
                batch.keywords.map { keyword ->
                    explainsByWord[keyword.word]
                        ?.let { keyword.copy(explain = it.explain, explainedAt = it.explainedAt) }
                        ?: keyword
                },
        )
    }

    private fun generateExplain(
        batch: CollectedTrendBatch,
        decision: KeywordExplainRefreshDecision,
        videos: List<CollectedVideo>,
        explainedAt: LocalDateTime,
    ): Pair<String, KeywordExplainResult>? {
        if (!geminiRateLimitGuard.canRequest()) {
            log.warn(
                "Skip keyword explain generation because Gemini is cooling down. generation={}, keyword={}, reason={}, remainingCooldownSeconds={}",
                batch.generation,
                decision.keyword.word,
                decision.reason,
                geminiRateLimitGuard.remainingCooldownSeconds(),
            )
            return null
        }

        return runCatching {
            val generatedText =
                keywordExplainGenerator.generate(
                    KeywordExplainRequest(
                        generation = batch.generation,
                        keyword = decision.keyword,
                        refreshReason = decision.reason,
                        previousExplain = decision.previousExplain,
                        previousRank = decision.previousRank,
                        consecutiveWeeks = decision.consecutiveWeeks,
                        videos = videos,
                    ),
                )
            val explain = keywordExplainValidator.normalize(generatedText)

            if (explain == null) {
                log.warn(
                    "Skip keyword explain generation because Gemini response failed validation. generation={}, keyword={}, reason={}",
                    batch.generation,
                    decision.keyword.word,
                    decision.reason,
                )
                null
            } else {
                decision.keyword.word to KeywordExplainResult(decision.keyword.word, explain, explainedAt)
            }
        }.onFailure { exception ->
            geminiRateLimitGuard.recordRateLimitIfNeeded(exception)
            log.warn(
                "Skip keyword explain generation because Gemini request failed. generation={}, keyword={}, reason={}, message={}",
                batch.generation,
                decision.keyword.word,
                decision.reason,
                exception.message,
            )
        }.getOrNull()
    }

    private fun CollectedTrendBatch.videoIdsByKeyword(): Map<String, List<String>> {
        val videoIdsByKeyword = linkedMapOf<String, MutableList<String>>()

        feedItems.forEach { feedItem ->
            videoIdsByKeyword
                .getOrPut(feedItem.keywordWord) { mutableListOf() }
                .add(feedItem.youtubeVideoId)
        }
        videoKeywords.forEach { videoKeyword ->
            videoIdsByKeyword
                .getOrPut(videoKeyword.keywordWord) { mutableListOf() }
                .add(videoKeyword.youtubeVideoId)
        }

        return videoIdsByKeyword.mapValues { (_, videoIds) -> videoIds.distinct() }
    }

    companion object {
        private val log = logger<KeywordExplainRefreshAppender>()
    }
}
