package com.mztrend.service.crawling

import com.mztrend.client.GeminiContentClient
import com.mztrend.client.GeminiGenerateContentGateway
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse

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
                    keyword =
                        collectedKeyword(
                            "아이브",
                            evidenceVideos =
                                listOf(
                                    CollectedKeywordEvidenceVideo(
                                        youtubeVideoId = "evidence-1",
                                        title = "아이브 신곡 공개",
                                        channelName = "공식 채널",
                                        description = "신곡 공개와 컴백 활동을 알리는 영상입니다.",
                                        viewCount = 2_000_000L,
                                    ),
                                ),
                        ),
                    refreshReason = KeywordExplainRefreshReason.FIRST_CONTINUED,
                    previousExplain = "기존에는 컴백 무대 중심으로 관심을 받았습니다.",
                    previousRank = 2,
                    consecutiveWeeks = 2,
                    videos =
                        listOf(
                            collectedVideo("아이브 신곡 공개", "공식 채널", youtubeVideoId = "evidence-1"),
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
        assertContains(prompt, "후보 추출 근거 영상:")
        assertContains(prompt, "아이브 신곡 공개 / 채널: 공식 채널")
        assertContains(prompt, "신곡 공개와 컴백 활동을 알리는 영상입니다.")
        assertContains(prompt, "키워드 검색 결과 영상:")
        assertContains(prompt, "아이브 컴백 무대")
        assertContains(prompt, "후보 추출 근거 영상에서 함께 등장한 작품명, 이벤트명, 그룹명, 공개 이슈를 우선 설명한다")
        assertContains(prompt, "현재 이슈를 우선한다")
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

    @Test
    fun `generate excludes only prompt evidence videos from search video context`() {
        val fakeClient = FakeGeminiContentClient("설명 결과")
        val generator =
            GeminiKeywordExplainGenerator(
                geminiContentClient = GeminiContentClient(fakeClient),
                properties =
                    ExternalApiProperties(
                        gemini =
                            ExternalApiProperties.Gemini(
                                maxPromptVideoCount = 1,
                            ),
                    ),
            )

        generator.generate(
            KeywordExplainRequest(
                generation = Generation.TEEN,
                keyword =
                    collectedKeyword(
                        "동궁",
                        evidenceVideos =
                            listOf(
                                evidenceVideo("evidence-1", "동궁 공식 예고편"),
                                evidenceVideo("evidence-2", "동궁 출연진 인터뷰"),
                            ),
                    ),
                refreshReason = KeywordExplainRefreshReason.NEW_KEYWORD,
                previousExplain = null,
                previousRank = null,
                consecutiveWeeks = 1,
                videos =
                    listOf(
                        collectedVideo("동궁 공식 예고편", "넷플릭스", youtubeVideoId = "evidence-1"),
                        collectedVideo("동궁 출연진 인터뷰", "연예 채널", youtubeVideoId = "evidence-2"),
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
        val evidenceSection = prompt.substringAfter("후보 추출 근거 영상:").substringBefore("키워드 검색 결과 영상:")
        val searchSection = prompt.substringAfter("키워드 검색 결과 영상:").substringBefore("작성 규칙:")

        assertContains(evidenceSection, "동궁 공식 예고편")
        assertFalse("동궁 출연진 인터뷰" in evidenceSection)
        assertFalse("동궁 공식 예고편" in searchSection)
        assertContains(searchSection, "동궁 출연진 인터뷰")
    }

    private fun collectedKeyword(
        word: String,
        evidenceVideos: List<CollectedKeywordEvidenceVideo> = emptyList(),
    ): CollectedKeyword =
        CollectedKeyword(
            word = word,
            currentRank = 1,
            trendScore = 90_000L,
            evidenceVideos = evidenceVideos,
        )

    private fun collectedVideo(
        title: String,
        channelName: String,
        youtubeVideoId: String = title,
    ): CollectedVideo =
        CollectedVideo(
            youtubeVideoId = youtubeVideoId,
            title = title,
            channelName = channelName,
            viewCount = 1_000_000L,
        )

    private fun evidenceVideo(
        youtubeVideoId: String,
        title: String,
    ): CollectedKeywordEvidenceVideo =
        CollectedKeywordEvidenceVideo(
            youtubeVideoId = youtubeVideoId,
            title = title,
            channelName = "근거 채널",
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
