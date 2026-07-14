package com.mztrend.service.crawling

import com.mztrend.domain.Generation
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
            .thenByDescending { candidate -> candidate.sharedEvidenceVideoCount }
            .thenByDescending { candidate -> if (candidate.hasEvidenceTextMention) 1 else 0 }
            .thenBy { candidate -> abs(keyword.rank - candidate.relatedKeyword.rank) }
            .thenBy { candidate -> candidate.relatedKeyword.rank }
            .thenByDescending { candidate -> candidate.relatedKeyword.trendScore }
            .thenBy { candidate -> candidate.relatedKeyword.word }

    private fun ScoredTrendKeyword.toRelationCandidate(relatedKeyword: ScoredTrendKeyword): KeywordRelationCandidate {
        val sharedEvidenceVideoCount = sharedEvidenceVideoCount(relatedKeyword)
        val hasEvidenceTextMention = hasEvidenceTextMention(relatedKeyword)
        val evidenceTextMentionScore = if (hasEvidenceTextMention) EVIDENCE_TEXT_MENTION_SCORE else 0
        val categoryScore = if (hasSameCategory(relatedKeyword)) CATEGORY_MATCH_SCORE else 0
        val score =
            sharedEvidenceVideoCount * SHARED_EVIDENCE_VIDEO_SCORE +
                evidenceTextMentionScore +
                categoryScore

        return KeywordRelationCandidate(
            relatedKeyword = relatedKeyword,
            score = score,
            sharedEvidenceVideoCount = sharedEvidenceVideoCount,
            hasEvidenceTextMention = hasEvidenceTextMention,
        )
    }

    private fun ScoredTrendKeyword.sharedEvidenceVideoCount(other: ScoredTrendKeyword): Int {
        val evidenceVideoIds = evidenceVideos.map { it.videoId }.toSet()
        if (evidenceVideoIds.isEmpty()) return 0

        return other.evidenceVideos.count { evidenceVideo -> evidenceVideo.videoId in evidenceVideoIds }
    }

    private fun ScoredTrendKeyword.hasEvidenceTextMention(other: ScoredTrendKeyword): Boolean =
        evidenceVideos.any { evidenceVideo -> other.word.isMentionedIn(evidenceVideo.searchableText()) } ||
            other.evidenceVideos.any { evidenceVideo -> word.isMentionedIn(evidenceVideo.searchableText()) }

    private fun String.isMentionedIn(text: String): Boolean {
        val normalizedKeyword = normalizeForSearch()
        if (normalizedKeyword.isBlank()) return false

        val normalizedText = text.normalizeForSearch()
        if (normalizedText.isBlank()) return false

        val keywordTokens = normalizedKeyword.split(" ")
        if (keywordTokens.size > 1) {
            return normalizedText.contains(normalizedKeyword) ||
                keywordTokens.all { keywordToken -> keywordToken in normalizedText.split(" ") }
        }

        if (normalizedKeyword.isShortAlphaNumeric()) {
            return normalizedKeyword in normalizedText.split(" ")
        }

        return normalizedText.contains(normalizedKeyword)
    }

    private fun String.normalizeForSearch(): String =
        lowercase()
            .replace(SEARCH_DELIMITER_REGEX, " ")
            .trim()
            .replace(MULTIPLE_WHITESPACE_REGEX, " ")

    private fun String.isShortAlphaNumeric(): Boolean =
        length <= SHORT_ALPHA_NUMERIC_MAX_LENGTH && all { character -> character.isLetterOrDigit() && !character.isHangul() }

    private fun Char.isHangul(): Boolean = this in '가'..'힣'

    private fun com.mztrend.service.crawling.candidate.TrendCandidateEvidenceVideo.searchableText(): String =
        listOf(title, channelName, description.orEmpty()).joinToString(" ")

    private data class KeywordRelationCandidate(
        val relatedKeyword: ScoredTrendKeyword,
        val score: Int,
        val sharedEvidenceVideoCount: Int,
        val hasEvidenceTextMention: Boolean,
    )

    private fun ScoredTrendKeyword.hasSameCategory(other: ScoredTrendKeyword): Boolean =
        !category.isNullOrBlank() && category == other.category

    private companion object {
        private const val RELATED_KEYWORD_LIMIT_PER_KEYWORD = 3
        private const val MIN_RELATION_SCORE = 1_000
        private const val SHARED_EVIDENCE_VIDEO_SCORE = 3_000
        private const val EVIDENCE_TEXT_MENTION_SCORE = 2_000
        private const val CATEGORY_MATCH_SCORE = 300
        private const val SHORT_ALPHA_NUMERIC_MAX_LENGTH = 3
        private const val KEYWORD_RELATION_SOURCE = "batch_assembler"
        private val SEARCH_DELIMITER_REGEX = Regex("[^\\p{L}\\p{N}가-힣]+")
        private val MULTIPLE_WHITESPACE_REGEX = Regex("\\s+")
    }
}
