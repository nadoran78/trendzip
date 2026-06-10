package com.mztrend.logging

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.mztrend.client.GeminiApiException
import com.mztrend.domain.ExternalApiDirection
import com.mztrend.domain.ExternalApiLog
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose
import com.mztrend.repository.command.ExternalApiLogRepository
import org.aspectj.lang.ProceedingJoinPoint
import org.mockito.ArgumentCaptor
import org.mockito.Mockito
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class RecordExternalApiLogAspectTest {
    @Test
    fun `record stores successful result and returns original value`() {
        val repository = Mockito.mock(ExternalApiLogRepository::class.java)
        val aspect = aspect(repository)
        val joinPoint = Mockito.mock(ProceedingJoinPoint::class.java)
        Mockito.`when`(joinPoint.args).thenReturn(arrayOf("request"))
        Mockito.`when`(joinPoint.proceed()).thenReturn("response")

        val result = aspect.record(joinPoint, annotation())

        assertEquals("response", result)
        val record = capturedLog(repository)
        assertEquals(ExternalApiDirection.OUTBOUND, record.direction)
        assertEquals(ExternalApiProvider.GEMINI, record.provider)
        assertEquals(ExternalApiPurpose.GEMINI_CANDIDATE_EXTRACTION, record.purpose)
        assertEquals(200, record.httpStatus)
        assertEquals(true, record.success)
        assertEquals("""["request"]""", record.requestBody)
        assertEquals("response", record.responseBody)
    }

    @Test
    fun `record stores failure and rethrows original exception`() {
        val repository = Mockito.mock(ExternalApiLogRepository::class.java)
        val aspect = aspect(repository)
        val joinPoint = Mockito.mock(ProceedingJoinPoint::class.java)
        val exception =
            GeminiApiException(
                message = "Gemini API request failed. status=503",
                httpStatus = 503,
                responseBody = """{"error":"overloaded"}""",
            )
        Mockito.`when`(joinPoint.args).thenReturn(emptyArray())
        Mockito.`when`(joinPoint.proceed()).thenThrow(exception)

        val thrown =
            assertFailsWith<GeminiApiException> {
                aspect.record(joinPoint, annotation())
            }

        assertEquals(exception, thrown)
        val record = capturedLog(repository)
        assertEquals(false, record.success)
        assertEquals(503, record.httpStatus)
        assertEquals("""{"error":"overloaded"}""", record.responseBody)
        assertEquals("Gemini API request failed. status=503", record.errorMessage)
    }

    private fun aspect(repository: ExternalApiLogRepository): RecordExternalApiLogAspect =
        RecordExternalApiLogAspect(
            recorder =
                ExternalApiLogRecorder(
                    repository = repository,
                    objectMapper = jacksonObjectMapper(),
                ),
            clock = Clock.fixed(Instant.parse("2026-06-09T18:00:00Z"), ZoneId.of("Asia/Seoul")),
        )

    private fun capturedLog(repository: ExternalApiLogRepository): ExternalApiLog {
        val captor = ArgumentCaptor.forClass(ExternalApiLog::class.java)
        Mockito.verify(repository).save(captor.capture())
        return captor.value
    }

    private fun annotation(): RecordExternalApiLog =
        AnnotatedMethodHolder::class
            .java
            .getDeclaredMethod("call")
            .getAnnotation(RecordExternalApiLog::class.java)

    private class AnnotatedMethodHolder {
        @RecordExternalApiLog(
            provider = ExternalApiProvider.GEMINI,
            purpose = ExternalApiPurpose.GEMINI_CANDIDATE_EXTRACTION,
            method = "POST",
            endpoint = "/models/{model}:generateContent",
        )
        fun call() = Unit
    }
}
