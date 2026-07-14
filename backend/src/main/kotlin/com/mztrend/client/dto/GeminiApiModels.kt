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
    val thinkingConfig: GeminiThinkingConfig? = null,
)

data class GeminiThinkingConfig(
    val thinkingLevel: String? = null,
)

data class GeminiGenerateContentResponse(
    val candidates: List<GeminiCandidate> = emptyList(),
    val usageMetadata: GeminiUsageMetadata? = null,
)

data class GeminiCandidate(
    val content: GeminiContent? = null,
    val finishReason: String? = null,
)

data class GeminiUsageMetadata(
    val promptTokenCount: Int? = null,
    val cachedContentTokenCount: Int? = null,
    val candidatesTokenCount: Int? = null,
    val thoughtsTokenCount: Int? = null,
    val totalTokenCount: Int? = null,
)
