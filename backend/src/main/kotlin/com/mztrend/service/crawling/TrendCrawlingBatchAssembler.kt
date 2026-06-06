package com.mztrend.service.crawling

import com.mztrend.domain.Generation
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import org.springframework.stereotype.Service

@Service
class TrendCrawlingBatchAssembler(
    private val keywordVideoCollector: KeywordVideoCollector,
) {
    fun assemble(
        generation: Generation,
        scoredKeywords: List<ScoredTrendKeyword>,
    ): CollectedTrendBatch {
        require(scoredKeywords.all { it.generation == generation }) {
            "Scored trend keywords must belong to the requested generation. generation=$generation"
        }

        val orderedKeywords = scoredKeywords.sortedBy { it.rank }
        val videoBatch = keywordVideoCollector.collect(generation, orderedKeywords)

        return CollectedTrendBatch(
            generation = generation,
            keywords = orderedKeywords.map { it.toCollectedKeyword() },
            videos = videoBatch.videos,
            feedItems = videoBatch.feedItems,
            videoKeywords = videoBatch.videoKeywords,
            // Keyword relation generation policy is not defined yet. Add a dedicated collector before populating this.
            keywordRelations = emptyList(),
        )
    }
}
