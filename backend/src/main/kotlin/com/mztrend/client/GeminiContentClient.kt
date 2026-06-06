package com.mztrend.client

import com.mztrend.client.dto.GeminiGenerateContentRequest

interface GeminiContentClient {
    fun generateText(request: GeminiGenerateContentRequest): String
}
