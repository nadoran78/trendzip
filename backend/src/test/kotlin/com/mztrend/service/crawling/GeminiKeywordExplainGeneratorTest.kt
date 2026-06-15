package com.mztrend.service.crawling

import com.mztrend.client.GeminiContentClient
import com.mztrend.client.GeminiGenerateContentGateway
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals

class GeminiKeywordExplainGeneratorTest {
    @Test
    fun `generate builds Korean prompt with keyword and video context`() {
        val fakeClient = FakeGeminiContentClient(" 설명 결과 ")
        val generator =
            GeminiKeywordExplainGenerator(
                geminiContentClient = GeminiContentClient(fakeClient),
                properties =
                    ExternalApiProperties(
                        gemini =
                            ExternalApiProperties.Gemini(
                                maxPromptVideoCount = 1,
                                temperature = 0.2,
                                maxOutputTokens = 256,
                            ),
                    ),
            )

        val explain =
            generator.generate(
                KeywordExplainRequest(
                    generation = Generation.TEEN,
                    keyword = collectedKeyword("아이브"),
                    refreshReason = KeywordExplainRefreshReason.FIRST_CONTINUED,
                    previousExplain = "기존에는 컴백 무대 중심으로 관심을 받았습니다.",
                    previousRank = 2,
                    consecutiveWeeks = 2,
                    videos =
                        listOf(
                            collectedVideo("아이브 컴백 무대", "채널 A"),
                            collectedVideo("두 번째 영상", "채널 B"),
                        ),
                ),
            )

        val prompt =
            fakeClient
                .lastRequest
                .contents
                .single()
                .parts
                .single()
                .text
        assertContains(prompt, "키워드: 아이브")
        assertContains(prompt, "세대: 10대")
        assertContains(prompt, "2주 연속")
        assertContains(prompt, "이전 순위: 2")
        assertContains(prompt, "연속 노출 주차: 2주")
        assertContains(prompt, "기존에는 컴백 무대 중심으로 관심을 받았습니다.")
        assertContains(prompt, "아이브 컴백 무대")
        assertContains(prompt, "3~5문장")
        assertContains(prompt, "단순히 문장을 덧붙이지 말고")
        assertContains(prompt, "확인되지 않은 사실을 단정하지 않는다")
        assertEquals(0.2, fakeClient.lastRequest.generationConfig?.temperature)
        assertEquals(256, fakeClient.lastRequest.generationConfig?.maxOutputTokens)
        assertEquals(
            "MINIMAL",
            fakeClient.lastRequest.generationConfig
                ?.thinkingConfig
                ?.thinkingLevel,
        )
        assertEquals("설명 결과", explain)
    }

    private fun collectedKeyword(word: String): CollectedKeyword =
        CollectedKeyword(
            word = word,
            currentRank = 1,
            trendScore = 90_000L,
        )

    private fun collectedVideo(
        title: String,
        channelName: String,
    ): CollectedVideo =
        CollectedVideo(
            youtubeVideoId = title,
            title = title,
            channelName = channelName,
            viewCount = 1_000_000L,
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
}
