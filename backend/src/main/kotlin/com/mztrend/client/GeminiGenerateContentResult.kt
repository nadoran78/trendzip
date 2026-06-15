package com.mztrend.client

import com.mztrend.client.dto.GeminiUsageMetadata

data class GeminiGenerateContentResult(
    val text: String,
    val finishReason: String?,
    val usageMetadata: GeminiUsageMetadata?,
)
