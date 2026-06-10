package com.mztrend.client

import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose
import com.mztrend.logging.RecordExternalApiLog
import org.springframework.stereotype.Service

@Service
class GeminiContentClient(
    private val geminiGenerateContentGateway: GeminiGenerateContentGateway,
) {
    @RecordExternalApiLog(
        provider = ExternalApiProvider.GEMINI,
        purpose = ExternalApiPurpose.GEMINI_CANDIDATE_EXTRACTION,
        method = "POST",
        endpoint = "/models/{model}:generateContent",
    )
    fun generateCandidateText(request: GeminiGenerateContentRequest): String = geminiGenerateContentGateway.generateText(request)

    @RecordExternalApiLog(
        provider = ExternalApiProvider.GEMINI,
        purpose = ExternalApiPurpose.GEMINI_KEYWORD_EXPLAIN,
        method = "POST",
        endpoint = "/models/{model}:generateContent",
    )
    fun generateKeywordExplainText(request: GeminiGenerateContentRequest): String = geminiGenerateContentGateway.generateText(request)
}
