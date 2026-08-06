package com.mztrend.service.crawling.candidate

import org.springframework.stereotype.Component

@Component
class TrendCandidatePostProcessor {
    fun process(candidates: List<TrendCandidate>): List<TrendCandidate> {
        val phraseTokenWords = candidates.toPhraseTokenWords()
        val mergedCandidates =
            candidates
                .asSequence()
                .mapNotNull { candidate -> candidate.toCanonicalCandidate(phraseTokenWords) }
                .filterNot { candidate -> candidate.isUnsupportedContextualCandidate(candidates) }
                .groupBy { it.word.lowercase() }
                .values
                .map { group -> group.merge() }

        return mergedCandidates
            .sortedWith(CANDIDATE_COMPARATOR)
            .mapIndexed { index, candidate -> candidate.copy(rank = index + 1) }
    }

    private fun TrendCandidate.toCanonicalCandidate(phraseTokenWords: Set<String>): TrendCandidate? {
        val normalizedWord = word.normalizeCandidateWord() ?: return null
        if (normalizedWord.isBlockedCandidate()) return null
        if (normalizedWord.lowercase() in phraseTokenWords) return null

        return copy(word = normalizedWord.toCanonicalWord())
    }

    private fun List<TrendCandidate>.toPhraseTokenWords(): Set<String> {
        val phrasesWithTokens =
            asSequence()
                .mapNotNull { candidate -> candidate.word.normalizeCandidateWord() }
                .filter { word -> word.contains(" ") }
                .filterNot { phrase -> phrase.isNoisyTitlePhrase() }
                .map { phrase ->
                    phrase to
                        phrase
                            .split(PHRASE_TOKEN_SEPARATOR_REGEX)
                            .mapNotNull { token -> token.normalizeCandidateWord() }
                }.filter { (phrase, tokens) ->
                    ASCII_TOKEN_REGEX.matches(phrase) && tokens.size >= MIN_SPLIT_SUPPRESSION_PHRASE_TOKEN_COUNT
                }

        return phrasesWithTokens
            .flatMap { (_, tokens) ->
                tokens
                    .asSequence()
                    .filterNot { token -> token.isBlockedCandidate() }
            }.map { token -> token.lowercase() }
            .toSet()
    }

    private fun String.normalizeCandidateWord(): String? {
        val normalized =
            trim()
                .trim('_', '-', '.', '+', ':', ';', ',', '!', '?', '#', '"', '\'', '`')
                .replace(MULTIPLE_WHITESPACE_REGEX, " ")
                .takeIf { it.isNotBlank() }
                ?: return null

        return if (ASCII_TOKEN_REGEX.matches(normalized) && !normalized.contains(" ")) {
            normalized.lowercase()
        } else {
            normalized
        }
    }

    private fun String.isBlockedCandidate(): Boolean {
        val normalized = lowercase()

        return length < MIN_CANDIDATE_LENGTH ||
            all { it.isDigit() } ||
            DOMAIN_LIKE_TOKEN_REGEX.matches(normalized) ||
            normalized in HARD_BLOCK_WORDS ||
            normalized in BLOCKED_PLATFORM_WORDS ||
            isNoisyTitlePhrase()
    }

    private fun String.isNoisyTitlePhrase(): Boolean = contains(" ") && TITLE_NOISE_PHRASE_REGEX.containsMatchIn(this)

    private fun TrendCandidate.isUnsupportedContextualCandidate(candidates: List<TrendCandidate>): Boolean {
        val normalizedWord = word.lowercase()
        if (normalizedWord !in CONTEXTUAL_FRAGMENT_WORDS) return false
        if (!hasStandaloneEvidence()) return true

        val evidenceVideoIds = evidenceVideos.map { it.videoId }.toSet()
        return candidates.any { phraseCandidate ->
            phraseCandidate.word.containsCandidateToken(normalizedWord) &&
                phraseCandidate.evidenceVideos.any { it.videoId in evidenceVideoIds }
        }
    }

    private fun TrendCandidate.hasStandaloneEvidence(): Boolean =
        evidenceVideos.any { evidenceVideo -> evidenceVideo.hasStandaloneEvidence(word) }

    private fun TrendCandidateEvidenceVideo.hasStandaloneEvidence(candidateWord: String): Boolean {
        val normalizedCandidate = candidateWord.normalizeComparable()
        val normalizedTitle = title.normalizeComparable()
        if (normalizedTitle == normalizedCandidate) return true
        if (normalizedTitle.startsWith("$normalizedCandidate ")) {
            val titleSuffix = normalizedTitle.removePrefix(normalizedCandidate).trim()
            if (TITLE_METADATA_PREFIX_REGEX.containsMatchIn(titleSuffix)) return true
        }

        return title
            .split(TITLE_SEGMENT_DELIMITER_REGEX)
            .any { segment -> segment.normalizeComparable() == normalizedCandidate }
    }

    private fun String.containsCandidateToken(candidateWord: String): Boolean {
        val normalizedPhrase = normalizeComparable()
        if (!normalizedPhrase.contains(" ") || normalizedPhrase.isNoisyTitlePhrase()) return false

        return normalizedPhrase.split(" ").any { token -> token == candidateWord }
    }

    private fun String.normalizeComparable(): String =
        lowercase()
            .trim()
            .trim('_', '-', '.', '+', ':', ';', ',', '!', '?', '#', '"', '\'', '`', '(', ')', '[', ']', '《', '》')
            .replace(MULTIPLE_WHITESPACE_REGEX, " ")

    private fun String.toCanonicalWord(): String = CANONICAL_WORDS[lowercase()] ?: this

    private fun List<TrendCandidate>.merge(): TrendCandidate {
        val firstCandidate = first()
        return firstCandidate.copy(
            score = sumOf { it.score },
            evidenceCount = sumOf { it.evidenceCount },
            totalViewCount = sumOf { it.totalViewCount },
            collectedAt = maxOf { it.collectedAt },
            evidenceVideos = flatMap { it.evidenceVideos }.distinctBy { it.videoId },
        )
    }

    companion object {
        private const val MIN_CANDIDATE_LENGTH = 2
        private const val MIN_SPLIT_SUPPRESSION_PHRASE_TOKEN_COUNT = 3
        private val CANDIDATE_COMPARATOR =
            compareByDescending<TrendCandidate> { it.score }
                .thenByDescending { it.evidenceCount }
                .thenByDescending { it.totalViewCount }
                .thenBy { it.word }
        private val MULTIPLE_WHITESPACE_REGEX = Regex("""\s+""")
        private val ASCII_TOKEN_REGEX = Regex("""[A-Za-z0-9_+.\-\s]+""")
        private val PHRASE_TOKEN_SEPARATOR_REGEX = Regex("""\s+""")
        private val DOMAIN_LIKE_TOKEN_REGEX =
            Regex("""(?i)(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|kr|me|to|io|tv|gg|shop|link|ly|app|dev)""")
        private val TITLE_NOISE_PHRASE_REGEX =
            Regex("""(?i)(?:\bepisode\b|\blive\b|\breview\b|\bshowcase\b|\bstage\b|\btrailer\b|\bvideo\b|단독|무대|방송|예고|예고편|영상|리뷰|총정리)""")
        private val HARD_BLOCK_WORDS =
            setOf(
                "and",
                "are",
                "by",
                "football",
                "game",
                "in",
                "is",
                "it",
                "live",
                "of",
                "official",
                "on",
                "showcase",
                "the",
                "to",
                "trailer",
                "video",
                "review",
                "you",
                "게임",
                "리뷰",
                "채널",
            )
        private val CONTEXTUAL_FRAGMENT_WORDS =
            setOf(
                "autumn",
                "fall",
                "korea",
                "korean",
                "spring",
                "summer",
                "winter",
                "가을",
                "겨울",
                "여름",
                "코리아",
                "한국",
            )
        private val TITLE_SEGMENT_DELIMITER_REGEX = Regex("""\s*[:|/·]\s*""")
        private val TITLE_METADATA_PREFIX_REGEX =
            Regex("""(?i)^(?:official|mv|music video|teaser|trailer|공식|예고|예고편|티저)(?:\s|$)""")
        private val BLOCKED_PLATFORM_WORDS =
            setOf(
                "chzzk",
                "치지직",
            )
        private val CANONICAL_WORDS =
            mapOf(
                "efootball" to "eFootball",
                "hybe" to "HYBE",
                "illit" to "ILLIT",
                "katseye" to "KATSEYE",
                "maple" to "메이플스토리",
                "메이플" to "메이플스토리",
                "maplestory" to "메이플스토리",
                "pes" to "PES",
            )
    }
}
