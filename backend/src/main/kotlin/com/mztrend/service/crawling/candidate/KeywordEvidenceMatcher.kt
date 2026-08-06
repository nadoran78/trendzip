package com.mztrend.service.crawling.candidate

internal object KeywordEvidenceMatcher {
    fun isMentionedIn(
        keyword: String,
        video: KeywordCandidateExtractionVideo,
    ): Boolean =
        isMentionedIn(
            keyword = keyword,
            texts = listOf(video.title, video.channelName, video.description.orEmpty()) + video.tags,
        )

    fun areBothMentionedIn(
        firstKeyword: String,
        secondKeyword: String,
        video: TrendCandidateEvidenceVideo,
    ): Boolean {
        val texts = listOf(video.title, video.channelName, video.description.orEmpty()) + video.tags
        return isMentionedIn(firstKeyword, texts) && isMentionedIn(secondKeyword, texts)
    }

    fun isMentionedIn(
        keyword: String,
        texts: List<String>,
    ): Boolean {
        val normalizedKeyword = keyword.normalizeForSearch()
        if (normalizedKeyword.isBlank()) return false

        return texts.any { text -> normalizedKeyword.isMentionedInNormalized(text.normalizeForSearch()) }
    }

    private fun String.isMentionedInNormalized(normalizedText: String): Boolean {
        if (normalizedText.isBlank()) return false

        val keywordTokens = split(" ")
        val textTokens = normalizedText.split(" ")
        if (keywordTokens.size > 1) {
            return normalizedText.contains(this) ||
                keywordTokens.all { keywordToken -> textTokens.any { textToken -> keywordToken.matchesToken(textToken) } }
        }

        return textTokens.any { textToken -> matchesToken(textToken) }
    }

    private fun String.matchesToken(textToken: String): Boolean {
        if (textToken == this) return true
        if (!textToken.startsWith(this)) return false

        return KOREAN_POSTPOSITION_REGEX.matches(textToken.removePrefix(this))
    }

    private fun String.normalizeForSearch(): String =
        lowercase()
            .replace(SEARCH_DELIMITER_REGEX, " ")
            .trim()
            .replace(MULTIPLE_WHITESPACE_REGEX, " ")

    private val SEARCH_DELIMITER_REGEX = Regex("[^\\p{L}\\p{N}가-힣]+")
    private val MULTIPLE_WHITESPACE_REGEX = Regex("\\s+")
    private val KOREAN_POSTPOSITION_REGEX =
        Regex("^(?:은|는|이|가|을|를|과|와|의|도|만|에|에서|에게|부터|까지|로|으로)(?:은|는|도|만)?$")
}
