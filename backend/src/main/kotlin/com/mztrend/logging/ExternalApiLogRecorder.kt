package com.mztrend.logging

import com.fasterxml.jackson.databind.ObjectMapper
import com.mztrend.domain.ExternalApiLog
import com.mztrend.repository.command.ExternalApiLogRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Service
class ExternalApiLogRecorder(
    private val repository: ExternalApiLogRepository,
    private val objectMapper: ObjectMapper,
    private val maxBodyLength: Int = MAX_BODY_LENGTH,
) {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun record(record: ExternalApiLogRecord) {
        repository.save(
            ExternalApiLog(
                direction = record.direction,
                provider = record.provider,
                purpose = record.purpose,
                method = record.method,
                endpoint = record.endpoint,
                httpStatus = record.httpStatus,
                success = record.success,
                durationMs = record.durationMs,
                requestBody = record.requestBodySource.toSafeBody(),
                responseBody = record.responseBodySource.toSafeBody(),
                errorMessage = record.errorMessage.toSafeBody(),
                startedAt = record.startedAt,
                endedAt = record.endedAt,
            ),
        )
    }

    private fun Any?.toSafeBody(): String? {
        val rawBody =
            when (this) {
                null -> return null
                is String -> this
                is Array<*> -> objectMapper.writeValueAsString(toList())
                else -> objectMapper.writeValueAsString(this)
            }

        return rawBody
            .maskSensitiveValues()
            .limitLength()
    }

    private fun String.maskSensitiveValues(): String =
        SENSITIVE_JSON_FIELD_REGEX
            .replace(this) { matchResult ->
                "${matchResult.groupValues[1]}***${matchResult.groupValues[3]}"
            }.let { masked ->
                SENSITIVE_QUERY_PARAM_REGEX.replace(masked) { matchResult ->
                    "${matchResult.groupValues[1]}***"
                }
            }.let { masked ->
                SENSITIVE_HEADER_REGEX.replace(masked) { matchResult ->
                    "${matchResult.groupValues[1]}***"
                }
            }

    private fun String.limitLength(): String =
        if (length <= maxBodyLength) {
            this
        } else {
            take(maxBodyLength) + TRUNCATED_SUFFIX
        }

    companion object {
        private const val MAX_BODY_LENGTH = 100_000
        private const val TRUNCATED_SUFFIX = "...[truncated]"
        private val SENSITIVE_JSON_FIELD_REGEX =
            Regex(
                pattern =
                    """(?i)("(?:apiKey|api_key|clientSecret|client_secret|authorization|x-goog-api-key|key|token|password)"\s*:\s*")([^"]*)(")""",
            )
        private val SENSITIVE_QUERY_PARAM_REGEX =
            Regex("""(?i)([?&](?:key|api_key|apiKey|client_secret|clientSecret|token|password)=)[^&\s]+""")
        private val SENSITIVE_HEADER_REGEX =
            Regex("""(?i)((?:authorization|x-goog-api-key|x-naver-client-secret)\s*[:=]\s*)[^,\n\r}]+""")
    }
}
