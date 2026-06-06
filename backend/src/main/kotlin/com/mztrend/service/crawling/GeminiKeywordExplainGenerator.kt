package com.mztrend.service.crawling

import com.mztrend.client.GeminiContentClient
import com.mztrend.client.dto.GeminiContent
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerationConfig
import com.mztrend.client.dto.GeminiPart
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import org.springframework.stereotype.Service

@Service
class GeminiKeywordExplainGenerator(
    private val geminiContentClient: GeminiContentClient,
    private val properties: ExternalApiProperties,
) : KeywordExplainGenerator {
    override fun generate(request: KeywordExplainRequest): String {
        val prompt = buildPrompt(request)
        val response =
            geminiContentClient.generateText(
                GeminiGenerateContentRequest(
                    contents =
                        listOf(
                            GeminiContent(
                                role = "user",
                                parts = listOf(GeminiPart(prompt)),
                            ),
                        ),
                    generationConfig =
                        GeminiGenerationConfig(
                            temperature = properties.gemini.temperature,
                            maxOutputTokens = properties.gemini.maxOutputTokens,
                        ),
                ),
            )

        return response.trim()
    }

    private fun buildPrompt(request: KeywordExplainRequest): String {
        val videoLines =
            request.videos
                .take(properties.gemini.maxPromptVideoCount)
                .mapIndexed { index, video ->
                    "${index + 1}. ${video.title} / 채널: ${video.channelName} / 조회수: ${video.viewCount ?: "알 수 없음"}"
                }
        val videos =
            videoLines
                .ifEmpty { listOf("- 관련 영상 정보 없음") }
                .joinToString(separator = "\n")

        return listOf(
            "너는 한국 MZ 트렌드를 30~40대 사용자에게 쉽게 설명하는 서비스의 분석가다.",
            "",
            request.refreshReason.toInstruction(request.generation),
            "",
            "키워드: ${request.keyword.word}",
            "세대: ${request.generation.toKoreanLabel()}",
            "현재 순위: ${request.keyword.currentRank ?: "알 수 없음"}",
            "이전 순위: ${request.previousRank ?: "알 수 없음"}",
            "연속 노출 주차: ${request.consecutiveWeeks}주",
            "트렌드 점수: ${request.keyword.trendScore ?: "알 수 없음"}",
            "기존 설명: ${request.previousExplain ?: "없음"}",
            "",
            "관련 YouTube 영상:",
            videos,
            "",
            "작성 규칙:",
            "- 한국어로 작성한다.",
            "- 30~40대 사용자가 이해하기 쉽게 쓴다.",
            "- 3~5문장으로 작성한다.",
            "- 키워드가 뜨는 이유와 소비 맥락 중심으로 설명한다.",
            "- 기존 설명이 있으면 단순히 문장을 덧붙이지 말고 현재 사용자에게 보여줄 최종 설명으로 자연스럽게 재작성한다.",
            "- 확인되지 않은 사실을 단정하지 않는다.",
            "- 개인정보, 혐오, 선정적 추측은 쓰지 않는다.",
            "- 제목, 번호, 마크다운 없이 설명 문장만 출력한다.",
        ).joinToString(separator = "\n")
    }

    private fun Generation.toKoreanLabel(): String =
        when (this) {
            Generation.TEEN -> "10대"
            Generation.TWENTY -> "20대"
        }

    private fun KeywordExplainRefreshReason.toInstruction(generation: Generation): String =
        when (this) {
            KeywordExplainRefreshReason.NEW_KEYWORD ->
                "아래 키워드가 왜 ${generation.toKoreanLabel()} 사이에서 새롭게 관심을 받는지 설명해라."
            KeywordExplainRefreshReason.MISSING_EXPLAIN ->
                "아래 키워드가 왜 ${generation.toKoreanLabel()} 사이에서 관심을 받는지 설명해라."
            KeywordExplainRefreshReason.FIRST_CONTINUED ->
                "아래 키워드가 왜 2주 연속 ${generation.toKoreanLabel()} 사이에서 관심을 이어가는지 설명해라."
            KeywordExplainRefreshReason.LONG_RUNNING ->
                "아래 키워드가 왜 여러 주 동안 ${generation.toKoreanLabel()} 사이에서 장기적으로 소비되는지 설명해라."
            KeywordExplainRefreshReason.RE_ENTRY ->
                "아래 키워드가 왜 다시 ${generation.toKoreanLabel()} 사이에서 주목받는지 설명해라."
            KeywordExplainRefreshReason.RANK_SURGED ->
                "아래 키워드의 순위가 왜 이번 회차에 더 강하게 상승했는지 설명해라."
        }
}
