package com.mztrend.service.crawling.candidate

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.mztrend.client.GeminiContentClient
import com.mztrend.client.GeminiRateLimiter
import com.mztrend.client.dto.GeminiContent
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerationConfig
import com.mztrend.client.dto.GeminiPart
import com.mztrend.client.dto.GeminiThinkingConfig
import com.mztrend.common.logger
import com.mztrend.config.ExternalApiProperties
import org.springframework.stereotype.Service

@Service
class GeminiKeywordCandidateExtractor(
    private val geminiContentClient: GeminiContentClient,
    private val geminiRateLimiter: GeminiRateLimiter,
    private val objectMapper: ObjectMapper,
    private val properties: ExternalApiProperties,
) : KeywordCandidateExtractor {
    override fun extract(request: KeywordCandidateExtractionRequest): KeywordCandidateExtractionResult {
        if (request.videos.isEmpty()) return KeywordCandidateExtractionResult()

        val response =
            runCatching {
                geminiRateLimiter.acquirePermit()
                geminiContentClient
                    .generateCandidateContent(
                        request =
                            GeminiGenerateContentRequest(
                                contents =
                                    listOf(
                                        GeminiContent(
                                            role = "user",
                                            parts = listOf(GeminiPart(buildPrompt(request))),
                                        ),
                                    ),
                                generationConfig =
                                    GeminiGenerationConfig(
                                        temperature = properties.gemini.temperature,
                                        maxOutputTokens = properties.gemini.candidateExtractionMaxOutputTokens,
                                        thinkingConfig = GeminiThinkingConfig(properties.gemini.thinkingLevel.uppercase()),
                                    ),
                            ),
                    ).text
            }.getOrElse { exception ->
                geminiRateLimiter.recordRateLimitIfNeeded(exception)
                log.warn("Skip Gemini keyword candidate extraction because request failed. message={}", exception.message)
                return KeywordCandidateExtractionResult()
            }

        return parseResponse(response).filterCandidates(request)
    }

    private fun buildPrompt(request: KeywordCandidateExtractionRequest): String {
        val videoLines =
            request.videos.joinToString(separator = "\n\n") { video ->
                listOf(
                    "videoId: ${video.videoId}",
                    "title: ${video.title}",
                    "channel: ${video.channelName}",
                    "tags: ${video.tags.joinToString(", ").ifBlank { "없음" }}",
                    "description: ${video.description ?: "없음"}",
                    "viewCount: ${video.viewCount ?: "알 수 없음"}",
                    "publishedAt: ${video.publishedAt ?: "알 수 없음"}",
                ).joinToString(separator = "\n")
            }

        return listOf(
            "너는 한국 YouTube 인기 영상 메타데이터에서 실제 트렌드 키워드 후보를 추출하는 분석기다.",
            "",
            "입력 영상 목록:",
            videoLines,
            "",
            "추출 기준:",
            "- 10대/20대가 검색하거나 피드에서 눌러볼 만한 고유명사, 콘텐츠명, 인물/그룹명, 밈, 게임명, 작품명, 챌린지명을 우선한다.",
            "- 작품명과 콘텐츠명은 공식 전체 명칭으로 작성하고 일부 단어만 떼어내지 않는다. 예: '메이드 인 코리아'는 허용하지만 '코리아'는 제외한다.",
            "- 게임, 리뷰처럼 범위가 넓은 장르·콘텐츠 형식, by, to, on, it, you 같은 일반 영어 단어, 치지직/CHZZK 같은 플랫폼명, 조사, 광고/출처 문구, URL 조각은 제외한다.",
            "- 단순 장르명이나 너무 넓은 단어보다 영상 여러 개에서 반복되거나 제목/태그에서 강하게 드러난 표현을 우선한다.",
            "- 확인 가능한 메타데이터에 근거한 후보만 반환하고, 없는 사실을 추측하지 않는다.",
            "- keyword는 한국어 원문 또는 널리 쓰이는 표기 그대로 작성한다.",
            "",
            "응답 규칙:",
            "- 반드시 JSON만 출력한다. 마크다운 코드블록, 설명 문장, 주석은 출력하지 않는다.",
            "- candidates 배열 길이는 최대 ${properties.gemini.candidateExtractionMaxCandidates}개다.",
            "- confidence는 0.0부터 1.0 사이 숫자다.",
            "- evidenceVideoIds에는 후보 판단 근거가 된 videoId만 넣는다.",
            "",
            "응답 형식:",
            """{"candidates":[{"keyword":"다비치","category":"음악","confidence":0.92,"evidenceVideoIds":["video-1"],"reason":"인기 영상 제목과 태그에서 반복 등장"}]}""",
        ).joinToString(separator = "\n")
    }

    private fun parseResponse(response: String): KeywordCandidateExtractionResult {
        val json = response.toJsonPayload()
        if (json.isBlank()) return KeywordCandidateExtractionResult()

        return runCatching {
            objectMapper.readValue<KeywordCandidateExtractionResult>(json)
        }.recoverCatching {
            val candidates =
                objectMapper.readValue(
                    json,
                    object : TypeReference<List<ExtractedKeywordCandidate>>() {},
                )
            KeywordCandidateExtractionResult(candidates)
        }.getOrElse { exception ->
            log.warn("Skip Gemini keyword candidate extraction because JSON parsing failed. message={}", exception.message)
            KeywordCandidateExtractionResult()
        }
    }

    private fun KeywordCandidateExtractionResult.filterCandidates(
        request: KeywordCandidateExtractionRequest,
    ): KeywordCandidateExtractionResult {
        val videosById = request.videos.associateBy { it.videoId }
        val minConfidence = properties.gemini.candidateExtractionMinConfidence
        val validCandidates =
            candidates
                .asSequence()
                .mapNotNull { candidate -> candidate.normalized(videosById) }
                .filter { it.confidence >= minConfidence }
                .distinctBy { it.keyword.lowercase() }
                .toList()
        val sortedCandidates =
            validCandidates.sortedWith(
                compareByDescending<ExtractedKeywordCandidate> { it.confidence }
                    .thenByDescending { it.evidenceVideoIds.size }
                    .thenBy { it.keyword },
            )
        val limitedCandidates =
            sortedCandidates.take(properties.gemini.candidateExtractionMaxCandidates)

        return KeywordCandidateExtractionResult(
            candidates = limitedCandidates,
        )
    }

    private fun ExtractedKeywordCandidate.normalized(
        videosById: Map<String, KeywordCandidateExtractionVideo>,
    ): ExtractedKeywordCandidate? {
        val normalizedKeyword =
            keyword
                .trim()
                .trim('#', '"', '\'', '`')
                .takeIf { it.length in MIN_KEYWORD_LENGTH..MAX_KEYWORD_LENGTH }
                ?: return null
        val normalizedEvidenceVideoIds =
            evidenceVideoIds
                .distinct()
                .filter { videoId ->
                    videosById[videoId]?.let { video -> KeywordEvidenceMatcher.isMentionedIn(normalizedKeyword, video) } == true
                }.takeIf { it.isNotEmpty() }
                ?: return null

        return copy(
            keyword = normalizedKeyword,
            category = category?.trim()?.takeIf { it.isNotBlank() },
            confidence = confidence.coerceIn(0.0, 1.0),
            evidenceVideoIds = normalizedEvidenceVideoIds,
            reason = reason?.trim()?.takeIf { it.isNotBlank() },
        )
    }

    private fun String.toJsonPayload(): String {
        val trimmed = trim()
        if (!trimmed.startsWith("```")) return trimmed

        return trimmed
            .removePrefix("```json")
            .removePrefix("```JSON")
            .removePrefix("```")
            .removeSuffix("```")
            .trim()
    }

    companion object {
        private const val MIN_KEYWORD_LENGTH = 2
        private const val MAX_KEYWORD_LENGTH = 30
        private val log = logger<GeminiKeywordCandidateExtractor>()
    }
}
