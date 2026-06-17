package com.mztrend.client

import com.mztrend.config.ExternalApiProperties
import org.springframework.data.redis.core.script.RedisScript
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RedisGeminiRateLimiterTest {
    @Test
    fun `acquirePermit sleeps when Redis script returns delay`() {
        val executor = RecordingRedisScriptExecutor(60_500L)
        val sleeper = RecordingSleeper()
        val limiter = limiter(executor = executor, sleeper = sleeper)

        limiter.acquirePermit()

        assertEquals(listOf(Duration.ofMillis(60_500)), sleeper.delays)
        assertEquals(
            listOf(
                "rate-limit:gemini:{gemini-test}:requests",
                "rate-limit:gemini:{gemini-test}:blocked-until",
                "rate-limit:gemini:{gemini-test}:sequence",
            ),
            executor.calls.single().keys,
        )
        assertEquals(listOf("60000", "5", "500", "120000"), executor.calls.single().args)
    }

    @Test
    fun `recordRateLimitIfNeeded stores blocked until by longer value between retry delay and default cooldown`() {
        val executor = RecordingRedisScriptExecutor(0L)
        val limiter = limiter(executor = executor)
        val exception =
            GeminiApiException(
                message = "Gemini API request failed. status=429",
                httpStatus = 429,
                responseBody = """{"error":{"details":[{"retryDelay":"21s"}]}}""",
            )

        assertTrue(limiter.recordRateLimitIfNeeded(exception))

        val call = executor.calls.single()
        assertEquals(listOf("rate-limit:gemini:{gemini-test}:blocked-until"), call.keys)
        assertEquals(FIXED_INSTANT.plusSeconds(60).toEpochMilli().toString(), call.args[0])
        assertEquals(listOf("120000", "60000", "500"), call.args.drop(1))
    }

    @Test
    fun `recordRateLimitIfNeeded uses retry delay when it is longer than default cooldown`() {
        val executor = RecordingRedisScriptExecutor(0L)
        val limiter = limiter(executor = executor)
        val exception =
            GeminiApiException(
                message = "Gemini API request failed. status=429",
                httpStatus = 429,
                responseBody = """{"error":{"details":[{"retryDelay":"90s"}]}}""",
            )

        assertTrue(limiter.recordRateLimitIfNeeded(exception))

        assertEquals(FIXED_INSTANT.plusSeconds(90).toEpochMilli().toString(), executor.calls.single().args[0])
    }

    @Test
    fun `recordRateLimitIfNeeded ignores non rate limit exceptions`() {
        val executor = RecordingRedisScriptExecutor(0L)
        val limiter = limiter(executor = executor)

        assertFalse(limiter.recordRateLimitIfNeeded(IllegalStateException("failed")))
        assertTrue(executor.calls.isEmpty())
    }

    @Test
    fun `reservePermit falls back to in-memory limit when Redis fails`() {
        val limiter = limiter(executor = FailingRedisScriptExecutor())

        repeat(5) {
            assertEquals(Duration.ZERO, limiter.reservePermit())
        }

        assertEquals(Duration.ofMillis(60_500), limiter.reservePermit())
    }

    @Test
    fun `recordRateLimitIfNeeded falls back to in-memory block when Redis fails`() {
        val limiter = limiter(executor = FailingRedisScriptExecutor())
        val exception =
            GeminiApiException(
                message = "Gemini API request failed. status=429",
                httpStatus = 429,
                responseBody = """{"error":{"details":[{"retryDelay":"30s"}]}}""",
            )

        assertTrue(limiter.recordRateLimitIfNeeded(exception))

        assertEquals(Duration.ofSeconds(60), limiter.reservePermit())
    }

    private fun limiter(
        executor: GeminiRedisScriptExecutor = RecordingRedisScriptExecutor(0L),
        sleeper: GeminiRateLimitSleeper = RecordingSleeper(),
    ): RedisGeminiRateLimiter =
        RedisGeminiRateLimiter(
            properties =
                ExternalApiProperties(
                    gemini =
                        ExternalApiProperties.Gemini(
                            model = "gemini-test",
                            rateLimitCooldownSeconds = 60,
                            rateLimitMaxRequestsPerMinute = 5,
                            rateLimitWindowSeconds = 60,
                            rateLimitSafetyDelayMillis = 500,
                        ),
                ),
            clock = Clock.fixed(FIXED_INSTANT, ZoneId.of("Asia/Seoul")),
            sleeper = sleeper,
            redisScriptExecutor = executor,
        )

    private data class RedisScriptCall(
        val keys: List<String>,
        val args: List<String>,
    )

    private class RecordingRedisScriptExecutor(
        vararg responses: Long,
    ) : GeminiRedisScriptExecutor {
        private val responses: ArrayDeque<Long> = ArrayDeque(responses.toList())
        val calls: MutableList<RedisScriptCall> = mutableListOf()

        override fun execute(
            script: RedisScript<Long>,
            keys: List<String>,
            args: List<String>,
        ): Long {
            calls += RedisScriptCall(keys, args)
            return responses.removeFirstOrNull() ?: 0L
        }
    }

    private class FailingRedisScriptExecutor : GeminiRedisScriptExecutor {
        override fun execute(
            script: RedisScript<Long>,
            keys: List<String>,
            args: List<String>,
        ): Long = throw IllegalStateException("Redis failed")
    }

    private class RecordingSleeper : GeminiRateLimitSleeper {
        val delays: MutableList<Duration> = mutableListOf()

        override fun sleep(delay: Duration) {
            delays += delay
        }
    }

    companion object {
        private val FIXED_INSTANT = Instant.parse("2026-06-14T00:00:00Z")
    }
}
