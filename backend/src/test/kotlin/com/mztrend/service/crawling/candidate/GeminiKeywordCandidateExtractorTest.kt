package com.mztrend.service.crawling.candidate

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.mztrend.client.GeminiApiException
import com.mztrend.client.GeminiContentClient
import com.mztrend.client.GeminiGenerateContentGateway
import com.mztrend.client.GeminiRateLimiter
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
                      "evidenceVideoIds": ["video-1"],
                      "reason": "근거 영상에 키워드 없음"
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
        assertContains(prompt, "치지직/CHZZK 같은 플랫폼명")
        assertContains(prompt, "'메이드 인 코리아'는 허용하지만 '코리아'는 제외한다")
        assertContains(prompt, "게임, 리뷰처럼 범위가 넓은 장르·콘텐츠 형식")
        assertContains(prompt, "videoId: video-1")
        assertContains(prompt, "title: 다비치 컴백 무대")
        assertContains(prompt, "description: 설명")
        assertEquals(0.3, fakeClient.lastRequest.generationConfig?.temperature)
        assertEquals(4096, fakeClient.lastRequest.generationConfig?.maxOutputTokens)
        assertEquals(
            "MINIMAL",
            fakeClient.lastRequest.generationConfig
                ?.thinkingConfig
                ?.thinkingLevel,
        )

        assertEquals(listOf("다비치"), result.candidates.map { it.keyword })

        val davichiCandidate = result.candidates.first()
        assertEquals("음악", davichiCandidate.category)
        assertEquals(0.91, davichiCandidate.confidence)
        assertEquals(listOf("video-1"), davichiCandidate.evidenceVideoIds)

        assertTrue(result.candidates.none { it.keyword == "아이브" })
        assertTrue(result.candidates.none { it.keyword == "뉴진스" })
    }

    @Test
    fun `extract returns empty result when Gemini request fails`() {
        val extractor = extractor(FailingGeminiContentClient())

        val result = extractor.extract(request())

        assertTrue(result.candidates.isEmpty())
    }

    @Test
    fun `extract returns empty result when Gemini response JSON is incomplete`() {
        val extractor = extractor(FakeGeminiContentClient("""{"candidates":[{"keyword":"다비치""""))

        val result = extractor.extract(request())

        assertTrue(result.candidates.isEmpty())
    }

    @Test
    fun `extract records rate limit and continues next Gemini request`() {
        val rateLimiter = RecordingGeminiRateLimiter()
        val failingClient = FailingGeminiContentClient()
        val failingExtractor = extractor(failingClient, rateLimiter)

        assertTrue(failingExtractor.extract(request()).candidates.isEmpty())

        val successClient =
            FakeGeminiContentClient(
                """{"candidates":[{"keyword":"다비치","confidence":0.9,"evidenceVideoIds":["video-1"]}]}""",
            )
        val waitingExtractor = extractor(successClient, rateLimiter)

        assertEquals(listOf("다비치"), waitingExtractor.extract(request()).candidates.map { it.keyword })
        assertTrue(successClient.wasCalled)
        assertEquals(2, rateLimiter.acquireCount)
        assertEquals(1, rateLimiter.rateLimitRecordCount)
    }

    private fun extractor(
        geminiGenerateContentGateway: GeminiGenerateContentGateway,
        geminiRateLimiter: GeminiRateLimiter = rateLimiter(),
    ): GeminiKeywordCandidateExtractor =
        GeminiKeywordCandidateExtractor(
            geminiContentClient = GeminiContentClient(geminiGenerateContentGateway),
            geminiRateLimiter = geminiRateLimiter,
            objectMapper = jacksonObjectMapper(),
            properties =
                ExternalApiProperties(
                    gemini =
                        ExternalApiProperties.Gemini(
                            candidateExtractionMinConfidence = 0.6,
                            candidateExtractionMaxCandidates = 10,
                            candidateExtractionMaxOutputTokens = 4096,
                        ),
                ),
        )

    private fun rateLimiter(): GeminiRateLimiter = RecordingGeminiRateLimiter()

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
        var wasCalled: Boolean = false

        override fun generateText(request: GeminiGenerateContentRequest): String {
            wasCalled = true
            lastRequest = request
            return response
        }
    }

    private class FailingGeminiContentClient : GeminiGenerateContentGateway {
        override fun generateText(request: GeminiGenerateContentRequest): String =
            throw GeminiApiException(
                message = "Gemini API request failed. status=429",
                httpStatus = 429,
                responseBody = """{"error":{"details":[{"retryDelay":"30s"}]}}""",
            )
    }

    private class RecordingGeminiRateLimiter : GeminiRateLimiter {
        var acquireCount: Int = 0
        var rateLimitRecordCount: Int = 0

        override fun acquirePermit() {
            acquireCount += 1
        }

        override fun recordRateLimitIfNeeded(exception: Throwable): Boolean {
            val recorded = exception is GeminiApiException && exception.httpStatus == 429
            if (recorded) rateLimitRecordCount += 1
            return recorded
        }
    }
}
