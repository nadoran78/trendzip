package com.mztrend.client

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
) : GeminiContentClient {
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
                throw GeminiApiException("Gemini API request failed. status=${exception.statusCode.value()}")
            } catch (exception: RestClientException) {
                throw GeminiApiException("Gemini API request failed. message=${exception.message}")
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

    private fun GeminiGenerateContentResponse.extractText(): String =
        candidates
            .firstNotNullOfOrNull { candidate ->
                candidate.content
                    ?.parts
                    ?.map { it.text.trim() }
                    ?.filter { it.isNotBlank() }
                    ?.joinToString(separator = "\n")
                    ?.takeIf { it.isNotBlank() }
            }
            ?: throw GeminiApiException("Gemini API response did not contain text.")

    companion object {
        private const val API_KEY_HEADER = "x-goog-api-key"
    }
}
