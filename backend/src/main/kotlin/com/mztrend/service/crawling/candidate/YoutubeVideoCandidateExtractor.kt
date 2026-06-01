package com.mztrend.service.crawling.candidate

import com.mztrend.client.dto.YoutubeVideoDetail
import org.springframework.stereotype.Component
import org.springframework.web.util.HtmlUtils
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import kotlin.math.min

@Component
class YoutubeVideoCandidateExtractor {
    fun extract(
        videos: List<YoutubeVideoDetail>,
        collectedAt: LocalDateTime = LocalDateTime.now(SEOUL_ZONE_ID),
        limit: Int = DEFAULT_CANDIDATE_LIMIT,
    ): List<TrendCandidate> {
        require(limit > 0) { "Trend candidate limit must be positive." }

        val statsByWord = linkedMapOf<String, CandidateStats>()
        videos.forEach { video ->
            collectEvidence(video).forEach { evidence ->
                val stats = statsByWord.getOrPut(evidence.word) { CandidateStats(evidence.word) }
                val viewCount = video.viewCount ?: 0

                stats.evidenceCount += evidence.weight
                if (stats.youtubeVideoIds.add(video.videoId)) {
                    stats.totalViewCount += viewCount
                }
                stats.score += evidence.toScore(video, collectedAt)
            }
        }

        val candidateComparator =
            compareByDescending<CandidateStats> { it.score }
                .thenByDescending { it.evidenceCount }
                .thenByDescending { it.totalViewCount }
                .thenBy { it.word }

        return statsByWord.values
            .sortedWith(candidateComparator)
            .take(limit)
            .mapIndexed { index, stats ->
                TrendCandidate(
                    word = stats.word,
                    source = TrendCandidateSourceType.YOUTUBE_POPULAR,
                    rank = index + 1,
                    score = stats.score,
                    evidenceCount = stats.evidenceCount,
                    totalViewCount = stats.totalViewCount,
                    collectedAt = collectedAt,
                )
            }
    }

    private fun collectEvidence(video: YoutubeVideoDetail): List<KeywordEvidence> =
        buildList {
            addWords(video.title, TITLE_WEIGHT)
            video.tags.forEach { addWords(it, TAG_WEIGHT) }
            video.description?.take(DESCRIPTION_SCAN_LENGTH)?.let { addWords(it, DESCRIPTION_WEIGHT) }
            addWords(video.channelName, CHANNEL_WEIGHT)
        }

    private fun MutableList<KeywordEvidence>.addWords(
        text: String,
        weight: Int,
    ) {
        extractWords(text).forEach { word -> add(KeywordEvidence(word, weight)) }
    }

    private fun extractWords(text: String): List<String> {
        val decodedText =
            HtmlUtils
                .htmlUnescape(text)
                .replace(URL_REGEX, " ")

        val hashtagWords =
            HASHTAG_REGEX
                .findAll(decodedText)
                .mapNotNull { match -> normalize(match.groupValues[1]) }

        val tokenWords =
            WORD_REGEX
                .findAll(decodedText)
                .mapNotNull { match -> normalize(match.value) }

        return (hashtagWords + tokenWords).distinct().toList()
    }

    private fun normalize(rawWord: String): String? {
        val word =
            rawWord
                .trim()
                .trim('_', '-', '.', '+')
                .takeIf { it.isNotBlank() }
                ?: return null

        val normalizedWord =
            if (ENGLISH_WORD_REGEX.matches(word)) {
                word.lowercase()
            } else {
                word
            }

        if (normalizedWord.length !in MIN_WORD_LENGTH..MAX_WORD_LENGTH) return null
        if (normalizedWord.all { it.isDigit() }) return null
        if (STOP_WORDS.contains(normalizedWord.lowercase())) return null

        return normalizedWord
    }

    private fun KeywordEvidence.toScore(
        video: YoutubeVideoDetail,
        collectedAt: LocalDateTime,
    ): Long {
        val viewScore = min((video.viewCount ?: 0) / VIEW_SCORE_UNIT, MAX_VIEW_SCORE)
        val recencyScore = video.publishedAt?.let { publishedAt -> resolveRecencyScore(publishedAt, collectedAt) } ?: 0L

        return (weight * WEIGHT_SCORE_UNIT) + viewScore + recencyScore
    }

    private fun resolveRecencyScore(
        publishedAt: LocalDateTime,
        collectedAt: LocalDateTime,
    ): Long {
        val ageDays =
            ChronoUnit.DAYS
                .between(publishedAt.toLocalDate(), collectedAt.toLocalDate())
                .coerceAtLeast(0)

        return (RECENCY_SCORE_WINDOW_DAYS - ageDays).coerceAtLeast(0)
    }

    private data class KeywordEvidence(
        val word: String,
        val weight: Int,
    )

    private data class CandidateStats(
        val word: String,
        var evidenceCount: Int = 0,
        var totalViewCount: Long = 0,
        var score: Long = 0,
        val youtubeVideoIds: MutableSet<String> = mutableSetOf(),
    )

    companion object {
        private const val DEFAULT_CANDIDATE_LIMIT = 50
        private const val DESCRIPTION_SCAN_LENGTH = 500
        private const val MIN_WORD_LENGTH = 2
        private const val MAX_WORD_LENGTH = 30
        private const val TITLE_WEIGHT = 3
        private const val TAG_WEIGHT = 4
        private const val DESCRIPTION_WEIGHT = 1
        private const val CHANNEL_WEIGHT = 1
        private const val WEIGHT_SCORE_UNIT = 10L
        private const val VIEW_SCORE_UNIT = 100_000L
        private const val MAX_VIEW_SCORE = 50L
        private const val RECENCY_SCORE_WINDOW_DAYS = 14L
        private val SEOUL_ZONE_ID = ZoneId.of("Asia/Seoul")
        private val URL_REGEX = Regex("""https?://\S+""")
        private val HASHTAG_REGEX = Regex("""#([\p{L}\p{N}_-]+)""")
        private val WORD_REGEX = Regex("""[\p{L}\p{N}][\p{L}\p{N}_+.-]{1,29}""")
        private val ENGLISH_WORD_REGEX = Regex("""[A-Za-z0-9_+.-]+""")
        private val STOP_WORDS =
            setOf(
                "a",
                "and",
                "are",
                "for",
                "full",
                "highlight",
                "highlights",
                "live",
                "mv",
                "official",
                "playlist",
                "reaction",
                "short",
                "shorts",
                "stage",
                "teaser",
                "the",
                "trailer",
                "video",
                "with",
                "공식",
                "노래",
                "다시보기",
                "라이브",
                "리액션",
                "모음",
                "쇼츠",
                "영상",
                "자막",
                "직캠",
                "편집",
                "풀버전",
                "하이라이트",
            )
    }
}
