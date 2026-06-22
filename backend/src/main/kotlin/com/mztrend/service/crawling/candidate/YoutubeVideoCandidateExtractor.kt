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
                stats.add(
                    evidence = evidence,
                    video = video,
                    evidenceScore = evidence.toScore(video, collectedAt),
                )
            }
        }

        val candidateComparator =
            compareByDescending<CandidateStats> { it.score() }
                .thenByDescending { it.evidenceCount }
                .thenByDescending { it.totalViewCount }
                .thenBy { it.word }

        return statsByWord.values
            .filter { stats -> stats.score() > 0 }
            .sortedWith(candidateComparator)
            .take(limit)
            .mapIndexed { index, stats ->
                TrendCandidate(
                    word = stats.word,
                    source = TrendCandidateSourceType.YOUTUBE_POPULAR,
                    rank = index + 1,
                    score = stats.score(),
                    evidenceCount = stats.evidenceCount,
                    totalViewCount = stats.totalViewCount,
                    collectedAt = collectedAt,
                    evidenceVideos = stats.evidenceVideos.values.toList(),
                )
            }
    }

    private fun collectEvidence(video: YoutubeVideoDetail): List<KeywordEvidence> =
        buildList {
            addTitleEvidence(video.title)
            video.tags.forEach { tag -> addTagEvidence(tag) }
            video.description
                ?.take(DESCRIPTION_SCAN_LENGTH)
                ?.let { description -> addDescriptionEvidence(description) }
            addChannelEvidence(video.channelName)
        }

    private fun MutableList<KeywordEvidence>.addTitleEvidence(text: String) {
        addHashtags(text, HASHTAG_WEIGHT, EvidenceSource.HASHTAG)
        val titleText = text.removeHashtags()
        addPhrases(titleText, TITLE_PHRASE_WEIGHT, EvidenceSource.TITLE)
        addWords(titleText, TITLE_WORD_WEIGHT, EvidenceSource.TITLE)
    }

    private fun MutableList<KeywordEvidence>.addTagEvidence(text: String) {
        addPhrase(text, TAG_PHRASE_WEIGHT, EvidenceSource.TAG)
        addWords(text, TAG_WORD_WEIGHT, EvidenceSource.TAG)
    }

    private fun MutableList<KeywordEvidence>.addDescriptionEvidence(text: String) {
        addHashtags(text, HASHTAG_WEIGHT, EvidenceSource.HASHTAG)
        addWords(text, DESCRIPTION_WORD_WEIGHT, EvidenceSource.DESCRIPTION)
    }

    private fun MutableList<KeywordEvidence>.addChannelEvidence(text: String) {
        val normalizedChannelName =
            text
                .replace(TOPIC_CHANNEL_SUFFIX_REGEX, "")
                .trim()
        addWords(normalizedChannelName, CHANNEL_WORD_WEIGHT, EvidenceSource.CHANNEL)
    }

    private fun MutableList<KeywordEvidence>.addWords(
        text: String,
        weight: Int,
        source: EvidenceSource,
    ) {
        extractWords(text).forEach { word -> add(KeywordEvidence(word, weight, source)) }
    }

    private fun MutableList<KeywordEvidence>.addHashtags(
        text: String,
        weight: Int,
        source: EvidenceSource,
    ) {
        decodeText(text)
            .let { decodedText -> HASHTAG_REGEX.findAll(decodedText) }
            .mapNotNull { match -> normalize(match.groupValues[1]) }
            .forEach { word -> add(KeywordEvidence(word, weight, source)) }
    }

    private fun MutableList<KeywordEvidence>.addPhrases(
        text: String,
        weight: Int,
        source: EvidenceSource,
    ) {
        extractPhrases(text).forEach { phrase -> add(KeywordEvidence(phrase, weight, source)) }
    }

    private fun MutableList<KeywordEvidence>.addPhrase(
        text: String,
        weight: Int,
        source: EvidenceSource,
    ) {
        normalize(text)?.let { phrase ->
            add(KeywordEvidence(phrase, weight, source))
        }
    }

    private fun extractWords(text: String): List<String> {
        val decodedText = decodeText(text)
        val tokenWords =
            WORD_REGEX
                .findAll(decodedText)
                .mapNotNull { match -> normalize(match.value) }

        return tokenWords.distinct().toList()
    }

    private fun extractPhrases(text: String): List<String> {
        val decodedText = decodeText(text)
        val wrappedPhrases =
            WRAPPED_PHRASE_REGEXES.flatMap { regex ->
                regex
                    .findAll(decodedText)
                    .mapNotNull { match -> normalize(match.groupValues[1]) }
                    .toList()
            }
        val delimitedPhrases =
            decodedText
                .split(TITLE_DELIMITER_REGEX)
                .mapNotNull { segment -> normalize(segment) }
                .filter { phrase -> phrase.contains(" ") }

        return (wrappedPhrases + delimitedPhrases)
            .filter { phrase -> phrase.length <= MAX_PHRASE_LENGTH }
            .distinct()
    }

    private fun decodeText(text: String): String =
        HtmlUtils
            .htmlUnescape(text)
            .replace(EMAIL_REGEX, " ")
            .replace(URL_REGEX, " ")
            .replace(DOMAIN_URL_REGEX, " ")

    private fun String.removeHashtags(): String =
        decodeText(this)
            .replace(HASHTAG_REGEX, " ")

    private fun normalize(rawWord: String): String? {
        val word =
            rawWord
                .trim()
                .trim('_', '-', '.', '+', ':', ';', ',', '!', '?', '#', '"', '\'', '`')
                .replace(MULTIPLE_WHITESPACE_REGEX, " ")
                .replace(HANGUL_NUMBER_SPACE_REGEX, "${'$'}1${'$'}2")
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
        if (DOMAIN_LIKE_TOKEN_REGEX.matches(normalizedWord.lowercase())) return null
        if (HARD_STOP_WORDS.contains(normalizedWord.lowercase())) return null
        if (INFORMATIONAL_PHRASE_REGEX.containsMatchIn(normalizedWord.lowercase())) return null

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
        val source: EvidenceSource,
    )

    private data class CandidateStats(
        val word: String,
        var evidenceCount: Int = 0,
        var totalViewCount: Long = 0,
        var rawScore: Long = 0,
        val youtubeVideoIds: MutableSet<String> = mutableSetOf(),
        val evidenceVideos: MutableMap<String, TrendCandidateEvidenceVideo> = linkedMapOf(),
        val sources: MutableSet<EvidenceSource> = mutableSetOf(),
    ) {
        fun add(
            evidence: KeywordEvidence,
            video: YoutubeVideoDetail,
            evidenceScore: Long,
        ) {
            evidenceCount += evidence.weight
            sources.add(evidence.source)
            if (youtubeVideoIds.add(video.videoId)) {
                totalViewCount += video.viewCount ?: 0
                evidenceVideos[video.videoId] =
                    TrendCandidateEvidenceVideo(
                        videoId = video.videoId,
                        title = video.title,
                        channelName = video.channelName,
                        description = video.description?.take(DESCRIPTION_SCAN_LENGTH),
                        viewCount = video.viewCount,
                    )
            }
            rawScore += evidenceScore
        }

        fun score(): Long {
            val contextualContentName =
                EvidenceSource.TITLE in sources &&
                    (EvidenceSource.TAG in sources || youtubeVideoIds.size > 1)
            val softPenalty =
                if (SOFT_CONTEXT_WORDS.contains(word.lowercase()) && !contextualContentName) {
                    SOFT_CONTEXT_WORD_PENALTY
                } else {
                    0L
                }
            val channelOnlyPenalty =
                if (sources.all { it == EvidenceSource.CHANNEL }) CHANNEL_ONLY_PENALTY else 0L

            return (rawScore - softPenalty - channelOnlyPenalty).coerceAtLeast(0)
        }
    }

    private enum class EvidenceSource {
        TITLE,
        TAG,
        HASHTAG,
        DESCRIPTION,
        CHANNEL,
    }

    companion object {
        private const val DEFAULT_CANDIDATE_LIMIT = 50
        private const val DESCRIPTION_SCAN_LENGTH = 500
        private const val MIN_WORD_LENGTH = 2
        private const val MAX_WORD_LENGTH = 30
        private const val MAX_PHRASE_LENGTH = 40
        private const val TITLE_PHRASE_WEIGHT = 7
        private const val TITLE_WORD_WEIGHT = 5
        private const val TAG_PHRASE_WEIGHT = 6
        private const val TAG_WORD_WEIGHT = 5
        private const val HASHTAG_WEIGHT = 4
        private const val DESCRIPTION_WORD_WEIGHT = 1
        private const val CHANNEL_WORD_WEIGHT = 1
        private const val WEIGHT_SCORE_UNIT = 10L
        private const val VIEW_SCORE_UNIT = 100_000L
        private const val MAX_VIEW_SCORE = 50L
        private const val RECENCY_SCORE_WINDOW_DAYS = 14L
        private const val SOFT_CONTEXT_WORD_PENALTY = 200L
        private const val CHANNEL_ONLY_PENALTY = 40L
        private val SEOUL_ZONE_ID = ZoneId.of("Asia/Seoul")
        private val URL_REGEX = Regex("""https?://\S+""")
        private val DOMAIN_URL_REGEX =
            Regex("""(?i)\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|kr|me|to|io|tv|gg|shop|link|ly|app|dev)(?:/\S*)?""")
        private val DOMAIN_LIKE_TOKEN_REGEX =
            Regex("""(?i)(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|kr|me|to|io|tv|gg|shop|link|ly|app|dev)""")
        private val EMAIL_REGEX = Regex("""\S+@\S+""")
        private val HASHTAG_REGEX = Regex("""#([\p{L}\p{N}_-]+)""")
        private val WORD_REGEX = Regex("""[\p{L}\p{N}][\p{L}\p{N}_+.-]{1,29}""")
        private val TITLE_DELIMITER_REGEX = Regex("""\s*[:|/·]\s*""")
        private val MULTIPLE_WHITESPACE_REGEX = Regex("""\s+""")
        private val HANGUL_NUMBER_SPACE_REGEX = Regex("""([\p{IsHangul}])\s+(\d)""")
        private val TOPIC_CHANNEL_SUFFIX_REGEX = Regex("""(?i)\s*-\s*topic$""")
        private val ENGLISH_WORD_REGEX = Regex("""[A-Za-z0-9_+.-]+""")
        private val INFORMATIONAL_PHRASE_REGEX =
            Regex("""(?i)\b(?:provided to|released on|auto-generated|subscribe to|business inquiry|credits?)\b""")
        private val WRAPPED_PHRASE_REGEXES =
            listOf(
                Regex("""['"`“”‘’]([^'"`“”‘’]{2,40})['"`“”‘’]"""),
                Regex("""[\(（]([^\)）]{2,40})[\)）]"""),
                Regex("""[\[【]([^\]】]{2,40})[\]】]"""),
                Regex("""[《≪]([^》≫]{2,40})[》≫]"""),
            )
        private val HARD_STOP_WORDS =
            setOf(
                "a",
                "and",
                "are",
                "auto",
                "channel",
                "for",
                "full",
                "generated",
                "highlight",
                "highlights",
                "live",
                "mv",
                "official",
                "playlist",
                "provided",
                "reaction",
                "released",
                "short",
                "shorts",
                "stage",
                "subscribe",
                "teaser",
                "the",
                "trailer",
                "video",
                "with",
                "youtube",
                "yt",
                "공식",
                "노래",
                "다시보기",
                "라이브",
                "리액션",
                "모음",
                "쇼츠",
                "영상",
                "예고편",
                "자막",
                "직캠",
                "편집",
                "풀버전",
                "하이라이트",
            )
        private val SOFT_CONTEXT_WORDS =
            setOf(
                "challenge",
                "funny",
                "home",
                "love",
                "trending",
                "viral",
            )
    }
}
