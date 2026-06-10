package com.mztrend.service.crawling.candidate

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.mztrend.client.GeminiContentClient
import com.mztrend.client.GeminiGenerateContentGateway
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.config.ExternalApiProperties
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GeminiKeywordCandidateExtractorTest {
    @Test
    fun `extract builds JSON prompt and filters low confidence candidates`() {
        val fakeClient =
            FakeGeminiContentClient(
                """
                ```json
                {
                  "candidates": [
                    {
                      "keyword": " 다비치 ",
                      "category": "음악",
                      "confidence": 0.91,
                      "evidenceVideoIds": ["video-1", "video-1", "unknown"],
                      "reason": "인기 영상 제목에서 반복 등장"
                    },
                    {
                      "keyword": "by",
                      "category": "일반어",
                      "confidence": 0.2,
                      "evidenceVideoIds": ["video-1"],
                      "reason": "낮은 확신"
                    },
                    {
                      "keyword": "아이브",
                      "category": "음악",
                      "confidence": 0.86,
                      "evidenceVideoIds": [],
                      "reason": "근거 영상 ID 누락"
                    },
                    {
                      "keyword": "뉴진스",
                      "category": "음악",
                      "confidence": 0.84,
                      "evidenceVideoIds": ["unknown"],
                      "reason": "근거 영상 ID 불일치"
                    }
                  ]
                }
                ```
                """.trimIndent(),
            )
        val extractor = extractor(fakeClient)

        val result = extractor.extract(request())

        val prompt =
            fakeClient
                .lastRequest
                .contents
                .single()
                .parts
                .single()
                .text
        assertContains(prompt, "반드시 JSON만 출력한다")
        assertContains(prompt, "by, to, on, it, you")
        assertContains(prompt, "videoId: video-1")
        assertContains(prompt, "title: 다비치 컴백 무대")
        assertContains(prompt, "description: 설명")
        assertEquals(0.3, fakeClient.lastRequest.generationConfig?.temperature)
        assertEquals(2048, fakeClient.lastRequest.generationConfig?.maxOutputTokens)

        assertEquals(listOf("다비치", "아이브", "뉴진스"), result.candidates.map { it.keyword })

        val davichiCandidate = result.candidates.first()
        assertEquals("음악", davichiCandidate.category)
        assertEquals(0.91, davichiCandidate.confidence)
        assertEquals(listOf("video-1"), davichiCandidate.evidenceVideoIds)

        val missingEvidenceCandidate = result.candidates.first { it.keyword == "아이브" }
        assertTrue(missingEvidenceCandidate.evidenceVideoIds.isEmpty())

        val unmatchedEvidenceCandidate = result.candidates.first { it.keyword == "뉴진스" }
        assertTrue(unmatchedEvidenceCandidate.evidenceVideoIds.isEmpty())
    }

    @Test
    fun `extract returns empty result when Gemini request fails`() {
        val extractor = extractor(FailingGeminiContentClient())

        val result = extractor.extract(request())

        assertTrue(result.candidates.isEmpty())
    }

    private fun extractor(geminiGenerateContentGateway: GeminiGenerateContentGateway): GeminiKeywordCandidateExtractor =
        GeminiKeywordCandidateExtractor(
            geminiContentClient = GeminiContentClient(geminiGenerateContentGateway),
            objectMapper = jacksonObjectMapper(),
            properties =
                ExternalApiProperties(
                    gemini =
                        ExternalApiProperties.Gemini(
                            candidateExtractionMinConfidence = 0.6,
                            candidateExtractionMaxCandidates = 10,
                            candidateExtractionMaxOutputTokens = 2048,
                        ),
                ),
        )

    private fun request(): KeywordCandidateExtractionRequest =
        KeywordCandidateExtractionRequest(
            collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            videos =
                listOf(
                    KeywordCandidateExtractionVideo(
                        videoId = "video-1",
                        title = "다비치 컴백 무대",
                        channelName = "음악 채널",
                        tags = listOf("다비치", "컴백"),
                        description = "설명",
                        viewCount = 1_000_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 31, 12, 0),
                    ),
                ),
        )

    private class FakeGeminiContentClient(
        private val response: String,
    ) : GeminiGenerateContentGateway {
        lateinit var lastRequest: GeminiGenerateContentRequest

        override fun generateText(request: GeminiGenerateContentRequest): String {
            lastRequest = request
            return response
        }
    }

    private class FailingGeminiContentClient : GeminiGenerateContentGateway {
        override fun generateText(request: GeminiGenerateContentRequest): String = throw IllegalStateException("gemini failed")
    }
}
