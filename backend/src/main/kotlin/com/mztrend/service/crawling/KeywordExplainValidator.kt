package com.mztrend.service.crawling

import com.mztrend.config.ExternalApiProperties
import org.springframework.stereotype.Component

@Component
class KeywordExplainValidator(
    private val properties: ExternalApiProperties,
) {
    fun normalize(rawExplain: String): String? {
        val explain = rawExplain.trim()
        if (explain.length < properties.gemini.explainMinLength) return null
        if (MARKDOWN_NOISE_REGEX.containsMatchIn(explain)) return null
        if (!COMPLETE_ENDING_REGEX.containsMatchIn(explain)) return null

        return explain
    }

    companion object {
        private val MARKDOWN_NOISE_REGEX = Regex("""(?m)(```|^\s*#{1,6}\s+|^\s*\*\*.+\*\*:?\s*$)""")
        private val COMPLETE_ENDING_REGEX = Regex("""(?:[.!?。？！]|다|요|죠|니다|습니다)[)"']?\s*$""")
    }
}
