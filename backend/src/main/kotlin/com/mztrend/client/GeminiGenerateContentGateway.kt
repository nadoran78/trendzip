package com.mztrend.client

import com.mztrend.client.dto.GeminiGenerateContentRequest

interface GeminiGenerateContentGateway {
    fun generateText(request: GeminiGenerateContentRequest): String

    fun generateContent(request: GeminiGenerateContentRequest): GeminiGenerateContentResult =
        GeminiGenerateContentResult(
            text = generateText(request),
            finishReason = null,
            usageMetadata = null,
        )
}
