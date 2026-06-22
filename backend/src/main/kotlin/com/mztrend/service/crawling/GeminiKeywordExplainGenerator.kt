package com.mztrend.service.crawling

import com.mztrend.client.GeminiContentClient
import com.mztrend.client.dto.GeminiContent
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerationConfig
import com.mztrend.client.dto.GeminiPart
import com.mztrend.client.dto.GeminiThinkingConfig
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
            geminiContentClient.generateKeywordExplainContent(
                request =
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
                                thinkingConfig = GeminiThinkingConfig(properties.gemini.thinkingLevel.uppercase()),
                            ),
                    ),
            )

        return response.text.trim()
    }

    private fun buildPrompt(request: KeywordExplainRequest): String {
        val promptEvidenceVideos = request.keyword.evidenceVideos.take(properties.gemini.maxPromptVideoCount)
        val evidenceVideoLines =
            promptEvidenceVideos.mapIndexed { index, video ->
                val description = video.description?.take(DESCRIPTION_SNIPPET_LENGTH)?.let { " / 설명: $it" } ?: ""
                "${index + 1}. ${video.title} / 채널: ${video.channelName} / 조회수: ${video.viewCount ?: "알 수 없음"}$description"
            }
        val evidenceVideos =
            evidenceVideoLines
                .ifEmpty { listOf("- 후보 추출 근거 영상 정보 없음") }
                .joinToString(separator = "\n")
        val evidenceVideoIds =
            promptEvidenceVideos
                .map { it.youtubeVideoId }
                .toSet()
        val searchVideoLines =
            request.videos
                .filterNot { video -> video.youtubeVideoId in evidenceVideoIds }
                .take(properties.gemini.maxPromptVideoCount)
                .mapIndexed { index, video ->
                    "${index + 1}. ${video.title} / 채널: ${video.channelName} / 조회수: ${video.viewCount ?: "알 수 없음"}"
                }
        val searchVideos =
            searchVideoLines
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
            "후보 추출 근거 영상:",
            evidenceVideos,
            "",
            "키워드 검색 결과 영상:",
            searchVideos,
            "",
            "작성 규칙:",
            "- 한국어로 작성한다.",
            "- 30~40대 사용자가 이해하기 쉽게 쓴다.",
            "- 3~5문장으로 작성한다.",
            "- 키워드가 뜨는 이유와 소비 맥락 중심으로 설명한다.",
            "- 후보 추출 근거 영상이 있으면 키워드가 뜨는 이유 판단의 1차 근거로 사용한다.",
            "- 인물 키워드는 후보 추출 근거 영상에서 함께 등장한 작품명, 이벤트명, 그룹명, 공개 이슈를 우선 설명한다.",
            "- 키워드 검색 결과 영상이 과거 클립이나 팬 영상 위주여도, 후보 추출 근거 영상의 현재 이슈와 충돌하면 현재 이슈를 우선한다.",
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

    companion object {
        private const val DESCRIPTION_SNIPPET_LENGTH = 180
    }
}
