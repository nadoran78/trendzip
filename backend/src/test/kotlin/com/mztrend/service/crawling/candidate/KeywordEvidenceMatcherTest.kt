package com.mztrend.service.crawling.candidate

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class KeywordEvidenceMatcherTest {
    @Test
    fun `matches reordered phrase tokens in one metadata field`() {
        val video = video(title = "2026 MSI 진행 방식")

        assertTrue(KeywordEvidenceMatcher.isMentionedIn("MSI 2026", video))
    }

    @Test
    fun `matches Korean postpositions attached to Korean and English keywords`() {
        val video = video(title = "T1은 소지섭에게는 새로운 도전")

        assertTrue(KeywordEvidenceMatcher.isMentionedIn("t1", video))
        assertTrue(KeywordEvidenceMatcher.isMentionedIn("소지섭", video))
    }

    @Test
    fun `does not match a keyword embedded in a longer word`() {
        val video = video(title = "메이드인코리아 공식 예고편")

        assertFalse(KeywordEvidenceMatcher.isMentionedIn("코리아", video))
    }

    private fun video(title: String): KeywordCandidateExtractionVideo =
        KeywordCandidateExtractionVideo(
            videoId = "video-1",
            title = title,
            channelName = "테스트 채널",
        )
}
