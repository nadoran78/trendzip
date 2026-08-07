package com.mztrend.service.crawling

import com.mztrend.domain.Generation
import com.mztrend.service.crawling.candidate.KeywordEvidenceMatcher
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import org.springframework.stereotype.Service
import kotlin.math.abs

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
            keywordRelations = orderedKeywords.toKeywordRelations(),
        )
    }

    private fun List<ScoredTrendKeyword>.toKeywordRelations(): List<CollectedKeywordRelation> =
        flatMap { keyword ->
            filterNot { candidate -> candidate.word == keyword.word }
                .map { relatedKeyword -> keyword.toRelationCandidate(relatedKeyword) }
                .filter { candidate -> candidate.score >= MIN_RELATION_SCORE }
                .sortedWith(relatedKeywordComparator(keyword))
                .take(RELATED_KEYWORD_LIMIT_PER_KEYWORD)
                .mapIndexed { index, candidate ->
                    CollectedKeywordRelation(
                        keywordWord = keyword.word,
                        relatedKeywordWord = candidate.relatedKeyword.word,
                        displayOrder = index + 1,
                        score = candidate.score,
                        source = KEYWORD_RELATION_SOURCE,
                    )
                }
        }

    private fun relatedKeywordComparator(keyword: ScoredTrendKeyword): Comparator<KeywordRelationCandidate> =
        compareByDescending<KeywordRelationCandidate> { candidate -> candidate.score }
            .thenByDescending { candidate -> candidate.coOccurrenceEvidenceVideoCount }
            .thenBy { candidate -> abs(keyword.rank - candidate.relatedKeyword.rank) }
            .thenBy { candidate -> candidate.relatedKeyword.rank }
            .thenByDescending { candidate -> candidate.relatedKeyword.trendScore }
            .thenBy { candidate -> candidate.relatedKeyword.word }

    private fun ScoredTrendKeyword.toRelationCandidate(relatedKeyword: ScoredTrendKeyword): KeywordRelationCandidate {
        val coOccurrenceEvidenceVideoCount = coOccurrenceEvidenceVideoCount(relatedKeyword)
        val categoryScore = if (hasSameCategory(relatedKeyword)) CATEGORY_MATCH_SCORE else 0
        val score = coOccurrenceEvidenceVideoCount * CO_OCCURRENCE_EVIDENCE_VIDEO_SCORE + categoryScore

        return KeywordRelationCandidate(
            relatedKeyword = relatedKeyword,
            score = score,
            coOccurrenceEvidenceVideoCount = coOccurrenceEvidenceVideoCount,
        )
    }

    private fun ScoredTrendKeyword.coOccurrenceEvidenceVideoCount(other: ScoredTrendKeyword): Int =
        (evidenceVideos + other.evidenceVideos)
            .groupBy { evidenceVideo -> evidenceVideo.videoId }
            .count { (_, evidenceVideos) ->
                evidenceVideos.any { evidenceVideo ->
                    KeywordEvidenceMatcher.areBothMentionedIn(
                        firstKeyword = word,
                        secondKeyword = other.word,
                        video = evidenceVideo,
                    )
                }
            }

    private data class KeywordRelationCandidate(
        val relatedKeyword: ScoredTrendKeyword,
        val score: Int,
        val coOccurrenceEvidenceVideoCount: Int,
    )

    private fun ScoredTrendKeyword.hasSameCategory(other: ScoredTrendKeyword): Boolean =
        !category.isNullOrBlank() && category == other.category

    private companion object {
        private const val RELATED_KEYWORD_LIMIT_PER_KEYWORD = 3
        private const val MIN_RELATION_SCORE = 1_000
        private const val CO_OCCURRENCE_EVIDENCE_VIDEO_SCORE = 5_000
        private const val CATEGORY_MATCH_SCORE = 300
        private const val KEYWORD_RELATION_SOURCE = "batch_assembler"
    }
}
