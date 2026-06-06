package com.mztrend.client.dto

data class GeminiGenerateContentRequest(
    val contents: List<GeminiContent>,
    val generationConfig: GeminiGenerationConfig? = null,
)

data class GeminiContent(
    val role: String? = null,
    val parts: List<GeminiPart>,
)

data class GeminiPart(
    val text: String,
)

data class GeminiGenerationConfig(
    val temperature: Double? = null,
    val maxOutputTokens: Int? = null,
)

data class GeminiGenerateContentResponse(
    val candidates: List<GeminiCandidate> = emptyList(),
)

data class GeminiCandidate(
    val content: GeminiContent? = null,
    val finishReason: String? = null,
)
