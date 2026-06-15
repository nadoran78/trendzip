package com.mztrend.client

import com.mztrend.client.dto.NaverSearchTrendRequest
import com.mztrend.client.dto.NaverSearchTrendResponse
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose
import com.mztrend.logging.RecordExternalApiLog
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
class NaverDataLabClient(
    private val properties: ExternalApiProperties,
    @param:Qualifier("naverRestTemplate")
    private val restTemplate: RestTemplate,
) : NaverDataLabTrendClient {
    @RecordExternalApiLog(
        provider = ExternalApiProvider.NAVER_DATALAB,
        purpose = ExternalApiPurpose.NAVER_TREND_SCORE,
        method = "POST",
        endpoint = "/search",
        requestMetadata = "@externalApiLogMetadataFactory.naverTrendRequest(#p0)",
        responseMetadata = "@externalApiLogMetadataFactory.naverTrendResponse(#result)",
    )
    override fun searchTrend(request: NaverSearchTrendRequest): NaverSearchTrendResponse {
        validateRequest(request)

        return try {
            restTemplate.postForObject(
                UriComponentsBuilder
                    .fromUriString(properties.naver.baseUrl.trimEnd('/'))
                    .path("/search")
                    .build()
                    .toUri(),
                HttpEntity(request, headers()),
                NaverSearchTrendResponse::class.java,
            ) ?: throw NaverDataLabException("Naver DataLab API returned an empty response.")
        } catch (exception: RestClientResponseException) {
            val metadata = exception.toResponseMetadata()
            throw NaverDataLabException(
                message = "Naver DataLab API request failed. status=${exception.statusCode.value()}",
                httpStatus = exception.statusCode.value(),
                responseBody = exception.responseBodyAsString.takeIf { it.isNotBlank() },
                responseMetadata = metadata,
            )
        } catch (exception: RestClientException) {
            throw NaverDataLabException("Naver DataLab API request failed. message=${exception.message}")
        }
    }

    private fun validateRequest(request: NaverSearchTrendRequest) {
        require(request.startDate.isNotBlank()) { "Naver DataLab startDate must not be blank." }
        require(request.endDate.isNotBlank()) { "Naver DataLab endDate must not be blank." }
        require(request.timeUnit.isNotBlank()) { "Naver DataLab timeUnit must not be blank." }
        require(request.keywordGroups.isNotEmpty()) { "Naver DataLab keywordGroups must not be empty." }
        require(request.keywordGroups.size <= properties.naver.maxKeywordGroupSize) {
            "Naver DataLab keywordGroups must not exceed ${properties.naver.maxKeywordGroupSize}."
        }

        request.keywordGroups.forEach { keywordGroup ->
            require(keywordGroup.groupName.isNotBlank()) { "Naver DataLab groupName must not be blank." }
            require(keywordGroup.keywords.isNotEmpty()) { "Naver DataLab keywords must not be empty." }
            require(keywordGroup.keywords.size <= MAX_KEYWORDS_PER_GROUP) {
                "Naver DataLab keywords must not exceed $MAX_KEYWORDS_PER_GROUP per group."
            }
            require(keywordGroup.keywords.all { it.isNotBlank() }) { "Naver DataLab keyword must not be blank." }
        }
    }

    private fun headers(): HttpHeaders =
        HttpHeaders().apply {
            contentType = MediaType.APPLICATION_JSON
            set(CLIENT_ID_HEADER, requireClientId())
            set(CLIENT_SECRET_HEADER, requireClientSecret())
        }

    private fun requireClientId(): String =
        properties.naver.clientId.takeIf { it.isNotBlank() }
            ?: throw NaverDataLabException("Naver DataLab client id is not configured.")

    private fun requireClientSecret(): String =
        properties.naver.clientSecret.takeIf { it.isNotBlank() }
            ?: throw NaverDataLabException("Naver DataLab client secret is not configured.")

    private fun RestClientResponseException.toResponseMetadata(): Map<String, Any?> =
        mapOf(
            "httpStatus" to statusCode.value(),
            "responseBodyLength" to responseBodyAsString.length,
        )

    companion object {
        private const val MAX_KEYWORDS_PER_GROUP = 20
        private const val CLIENT_ID_HEADER = "X-Naver-Client-Id"
        private const val CLIENT_SECRET_HEADER = "X-Naver-Client-Secret"
    }
}
