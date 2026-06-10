package com.mztrend.client

import com.mztrend.client.dto.GeminiGenerateContentRequest

interface GeminiGenerateContentGateway {
    fun generateText(request: GeminiGenerateContentRequest): String
}
