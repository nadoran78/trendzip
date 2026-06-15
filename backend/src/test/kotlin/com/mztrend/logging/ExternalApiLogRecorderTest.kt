package com.mztrend.logging

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.mztrend.domain.ExternalApiDirection
import com.mztrend.domain.ExternalApiLog
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose
import com.mztrend.repository.command.ExternalApiLogRepository
import org.mockito.ArgumentCaptor
import org.mockito.Mockito
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class ExternalApiLogRecorderTest {
    private val repository = Mockito.mock(ExternalApiLogRepository::class.java)

    @Test
    fun `record stores masked and truncated request and response bodies`() {
        val recorder =
            ExternalApiLogRecorder(
                repository = repository,
                objectMapper = jacksonObjectMapper(),
                maxBodyLength = 80,
            )
        val startedAt = LocalDateTime.of(2026, 6, 10, 1, 0)
        val endedAt = LocalDateTime.of(2026, 6, 10, 1, 0, 1)

        recorder.record(
            ExternalApiLogRecord(
                direction = ExternalApiDirection.OUTBOUND,
                provider = ExternalApiProvider.GEMINI,
                purpose = ExternalApiPurpose.GEMINI_KEYWORD_EXPLAIN,
                method = "POST",
                endpoint = "/models/{model}:generateContent?key=secret-key",
                httpStatus = 503,
                success = false,
                durationMs = 1_000,
                requestBodySource =
                    mapOf(
                        "apiKey" to "secret-key",
                        "prompt" to "긴 프롬프트".repeat(20),
                    ),
                responseBodySource = "Authorization: Bearer secret-token",
                requestMetadata =
                    mapOf(
                        "apiKey" to "secret-key",
                        "maxOutputTokens" to 1024,
                    ),
                responseMetadata =
                    mapOf(
                        "usageMetadata" to mapOf("thoughtsTokenCount" to 700),
                    ),
                errorMessage = "x-goog-api-key: secret-key",
                startedAt = startedAt,
                endedAt = endedAt,
            ),
        )

        val log = capturedLog()
        assertEquals(ExternalApiDirection.OUTBOUND, log.direction)
        assertEquals(ExternalApiProvider.GEMINI, log.provider)
        assertEquals(ExternalApiPurpose.GEMINI_KEYWORD_EXPLAIN, log.purpose)
        assertEquals(503, log.httpStatus)
        assertFalse(log.success)
        assertContains(requireNotNull(log.requestBody), """"apiKey":"***"""")
        assertContains(requireNotNull(log.requestBody), "[truncated]")
        assertEquals("Authorization: ***", log.responseBody)
        assertEquals("***", log.requestMetadata?.get("apiKey"))
        assertEquals(1024, log.requestMetadata?.get("maxOutputTokens"))
        assertEquals(mapOf("thoughtsTokenCount" to 700), log.responseMetadata?.get("usageMetadata"))
        assertEquals("x-goog-api-key: ***", log.errorMessage)
    }

    private fun capturedLog(): ExternalApiLog {
        val captor = ArgumentCaptor.forClass(ExternalApiLog::class.java)
        Mockito.verify(repository).save(captor.capture())
        return captor.value
    }
}
