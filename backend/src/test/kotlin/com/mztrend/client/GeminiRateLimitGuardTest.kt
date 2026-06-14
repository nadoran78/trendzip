package com.mztrend.client

import com.mztrend.config.ExternalApiProperties
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class GeminiRateLimitGuardTest {
    @Test
    fun `recordRateLimitIfNeeded blocks requests by retry delay from response body`() {
        val guard = guard()
        val exception =
            GeminiApiException(
                message = "Gemini API request failed. status=429",
                httpStatus = 429,
                responseBody = """{"error":{"details":[{"retryDelay":"21s"}]}}""",
            )

        assertTrue(guard.recordRateLimitIfNeeded(exception))

        assertFalse(guard.canRequest())
        assertEquals(21, guard.remainingCooldownSeconds())
    }

    @Test
    fun `recordRateLimitIfNeeded ignores non rate limit exceptions`() {
        val guard = guard()

        assertFalse(guard.recordRateLimitIfNeeded(IllegalStateException("failed")))
        assertTrue(guard.canRequest())
    }

    private fun guard(): GeminiRateLimitGuard =
        GeminiRateLimitGuard(
            properties =
                ExternalApiProperties(
                    gemini = ExternalApiProperties.Gemini(rateLimitCooldownSeconds = 60),
                ),
            clock = Clock.fixed(Instant.parse("2026-06-14T00:00:00Z"), ZoneId.of("Asia/Seoul")),
        )
}
