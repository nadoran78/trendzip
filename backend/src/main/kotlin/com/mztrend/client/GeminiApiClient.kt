package com.mztrend.client

import com.mztrend.client.dto.GeminiCandidate
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerateContentResponse
import com.mztrend.config.ExternalApiProperties
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder

@Component
class GeminiApiClient(
    private val properties: ExternalApiProperties,
    @param:Qualifier("geminiRestTemplate")
    private val restTemplate: RestTemplate,
) : GeminiGenerateContentGateway {
    override fun generateText(request: GeminiGenerateContentRequest): String {
        validateRequest(request)

        val response =
            try {
                restTemplate.postForObject(
                    UriComponentsBuilder
                        .fromUriString(properties.gemini.baseUrl.trimEnd('/'))
                        .path("/models/${properties.gemini.model}:generateContent")
                        .build()
                        .toUri(),
                    HttpEntity(request, headers()),
                    GeminiGenerateContentResponse::class.java,
                ) ?: throw GeminiApiException("Gemini API returned an empty response.")
            } catch (exception: RestClientResponseException) {
                throw GeminiApiException(
                    message = "Gemini API request failed. status=${exception.statusCode.value()}",
                    httpStatus = exception.statusCode.value(),
                    responseBody = exception.responseBodyAsString.takeIf { it.isNotBlank() },
                    cause = exception,
                )
            } catch (exception: RestClientException) {
                throw GeminiApiException(
                    message = "Gemini API request failed. message=${exception.message}",
                    cause = exception,
                )
            }

        return response.extractText()
    }

    private fun validateRequest(request: GeminiGenerateContentRequest) {
        require(request.contents.isNotEmpty()) { "Gemini contents must not be empty." }
        require(request.contents.any { content -> content.parts.any { it.text.isNotBlank() } }) {
            "Gemini text prompt must not be blank."
        }
    }

    private fun headers(): HttpHeaders =
        HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set(API_KEY_HEADER, requireApiKey())
        }

    private fun requireApiKey(): String =
        properties.gemini.apiKey.takeIf { it.isNotBlank() }
            ?: throw GeminiApiException("Gemini API key is not configured.")

    private fun GeminiGenerateContentResponse.extractText(): String {
        val candidate = candidates.firstOrNull() ?: throw GeminiApiException("Gemini API response did not contain text.")
        candidate.validateFinishReason()

        return candidate.content
            ?.parts
            ?.map { it.text.trim() }
            ?.filter { it.isNotBlank() }
            ?.joinToString(separator = "\n")
            ?.takeIf { it.isNotBlank() }
            ?: throw GeminiApiException("Gemini API response did not contain text.")
    }

    private fun GeminiCandidate.validateFinishReason() {
        val reason = finishReason?.trim()?.uppercase() ?: return
        if (reason != FINISH_REASON_STOP) {
            throw GeminiApiException(
                message = "Gemini API response was not completed. finishReason=$reason",
                httpStatus = SUCCESS_STATUS,
                responseBody = toFailureResponseBody(reason),
            )
        }
    }

    private fun GeminiCandidate.toFailureResponseBody(reason: String): String {
        val text =
            content
                ?.parts
                ?.map { it.text.trim() }
                ?.filter { it.isNotBlank() }
                ?.joinToString(separator = "\n")
                ?.take(MAX_FAILURE_TEXT_LENGTH)
                .orEmpty()
                .escapeJson()

        return """{"finishReason":"$reason","text":"$text"}"""
    }

    private fun String.escapeJson(): String =
        buildString {
            this@escapeJson.forEach { char ->
                when (char) {
                    '\\' -> append("\\\\")
                    '"' -> append("\\\"")
                    '\n' -> append("\\n")
                    '\r' -> append("\\r")
                    '\t' -> append("\\t")
                    else -> append(char)
                }
            }
        }

    companion object {
        private const val API_KEY_HEADER = "x-goog-api-key"
        private const val FINISH_REASON_STOP = "STOP"
        private const val MAX_FAILURE_TEXT_LENGTH = 2_000
        private const val SUCCESS_STATUS = 200
    }
}
