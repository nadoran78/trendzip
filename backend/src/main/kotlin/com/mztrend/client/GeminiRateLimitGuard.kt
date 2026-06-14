package com.mztrend.client

import com.mztrend.config.ExternalApiProperties
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant

@Component
class GeminiRateLimitGuard(
    private val properties: ExternalApiProperties,
    private val clock: Clock,
) {
    private var blockedUntil: Instant? = null

    @Synchronized
    fun canRequest(): Boolean = remainingCooldownSeconds() == 0L

    @Synchronized
    fun remainingCooldownSeconds(): Long {
        val until = blockedUntil ?: return 0L
        val remainingSeconds = Duration.between(Instant.now(clock), until).seconds

        return remainingSeconds.coerceAtLeast(0L)
    }

    @Synchronized
    fun recordRateLimitIfNeeded(exception: Throwable): Boolean {
        val geminiException = exception as? GeminiApiException ?: return false
        if (geminiException.httpStatus != TOO_MANY_REQUESTS_STATUS) return false

        val cooldownSeconds =
            geminiException.responseBody
                ?.let(::extractRetryDelaySeconds)
                ?: properties.gemini.rateLimitCooldownSeconds

        blockedUntil = Instant.now(clock).plusSeconds(cooldownSeconds.coerceAtLeast(1L))
        return true
    }

    private fun extractRetryDelaySeconds(responseBody: String): Long? =
        RETRY_DELAY_SECONDS_REGEX
            .find(responseBody)
            ?.groupValues
            ?.getOrNull(1)
            ?.toLongOrNull()

    companion object {
        private const val TOO_MANY_REQUESTS_STATUS = 429
        private val RETRY_DELAY_SECONDS_REGEX = Regex("""\"retryDelay\"\s*:\s*\"(\d+)s\"""")
    }
}
