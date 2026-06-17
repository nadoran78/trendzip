package com.mztrend.client

import com.mztrend.common.logger
import com.mztrend.config.ExternalApiProperties
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.time.Instant

@Component
class RedisGeminiRateLimiter(
    private val properties: ExternalApiProperties,
    private val clock: Clock,
    private val sleeper: GeminiRateLimitSleeper,
    private val redisScriptExecutor: GeminiRedisScriptExecutor,
) : GeminiRateLimiter {
    private val fallbackReservedRequestTimes: MutableList<Instant> = mutableListOf()
    private var fallbackBlockedUntil: Instant? = null

    override fun acquirePermit() {
        val delay = reservePermit()
        if (delay <= Duration.ZERO) return

        log.info("Wait for Gemini rate limit permit. delayMillis={}", delay.toMillis())
        sleeper.sleep(delay)
    }

    internal fun reservePermit(): Duration =
        runCatching {
            reservePermitInRedis()
        }.getOrElse { exception ->
            log.warn("Fallback to in-memory Gemini rate limit because Redis request failed. message={}", exception.message)
            reservePermitInMemory()
        }

    override fun recordRateLimitIfNeeded(exception: Throwable): Boolean {
        val geminiException = exception as? GeminiApiException ?: return false
        if (geminiException.httpStatus != TOO_MANY_REQUESTS_STATUS) return false

        val cooldownSeconds = cooldownSeconds(geminiException)
        val newBlockedUntil = Instant.now(clock).plusSeconds(cooldownSeconds)

        runCatching {
            recordBlockedUntilInRedis(newBlockedUntil)
        }.onFailure { redisException ->
            log.warn(
                "Fallback to in-memory Gemini rate limit block because Redis request failed. message={}",
                redisException.message,
            )
            recordBlockedUntilInMemory(newBlockedUntil)
        }

        return true
    }

    private fun reservePermitInRedis(): Duration {
        val gemini = properties.gemini
        val delayMillis =
            redisScriptExecutor.execute(
                script = RESERVE_PERMIT_SCRIPT,
                keys = listOf(requestsKey(), blockedUntilKey(), sequenceKey()),
                args =
                    listOf(
                        Duration.ofSeconds(gemini.rateLimitWindowSeconds).toMillis().toString(),
                        gemini.rateLimitMaxRequestsPerMinute.toString(),
                        gemini.rateLimitSafetyDelayMillis.toString(),
                        baseRedisKeyTtl().toMillis().toString(),
                    ),
            )

        return Duration.ofMillis(delayMillis.coerceAtLeast(0L))
    }

    private fun recordBlockedUntilInRedis(newBlockedUntil: Instant) {
        val gemini = properties.gemini
        redisScriptExecutor.execute(
            script = RECORD_BLOCKED_UNTIL_SCRIPT,
            keys = listOf(blockedUntilKey()),
            args =
                listOf(
                    newBlockedUntil.toEpochMilli().toString(),
                    baseRedisKeyTtl().toMillis().toString(),
                    Duration.ofSeconds(gemini.rateLimitWindowSeconds).toMillis().toString(),
                    gemini.rateLimitSafetyDelayMillis.toString(),
                ),
        )
    }

    @Synchronized
    private fun reservePermitInMemory(): Duration {
        val now = Instant.now(clock)
        pruneExpiredFallbackRequestTimes(now)

        val availableAt = nextAvailableAt(now, fallbackReservedRequestTimes, fallbackBlockedUntil)
        fallbackReservedRequestTimes += availableAt
        fallbackReservedRequestTimes.sort()

        return Duration.between(now, availableAt).coerceAtLeastZero()
    }

    @Synchronized
    private fun recordBlockedUntilInMemory(newBlockedUntil: Instant) {
        fallbackBlockedUntil =
            fallbackBlockedUntil
                ?.takeIf { it.isAfter(newBlockedUntil) }
                ?: newBlockedUntil
    }

    private fun nextAvailableAt(
        now: Instant,
        reservedRequestTimes: List<Instant>,
        blockedUntil: Instant?,
    ): Instant {
        val gemini = properties.gemini
        var candidate =
            blockedUntil
                ?.takeIf { it.isAfter(now) }
                ?: now

        while (true) {
            val windowStart = candidate.minusSeconds(gemini.rateLimitWindowSeconds)
            val requestsInWindow =
                reservedRequestTimes.filter { requestTime ->
                    requestTime.isAfter(windowStart) && !requestTime.isAfter(candidate)
                }

            if (requestsInWindow.size < gemini.rateLimitMaxRequestsPerMinute) return candidate

            candidate =
                requestsInWindow
                    .first()
                    .plusSeconds(gemini.rateLimitWindowSeconds)
                    .plusMillis(gemini.rateLimitSafetyDelayMillis)
        }
    }

    private fun pruneExpiredFallbackRequestTimes(now: Instant) {
        val retentionStart =
            now
                .minusSeconds(properties.gemini.rateLimitWindowSeconds)
                .minusMillis(properties.gemini.rateLimitSafetyDelayMillis)

        fallbackReservedRequestTimes.removeAll { requestTime -> !requestTime.isAfter(retentionStart) }
    }

    private fun cooldownSeconds(exception: GeminiApiException): Long {
        val retryDelaySeconds = exception.responseBody?.let(::extractRetryDelaySeconds)

        return maxOf(
            retryDelaySeconds ?: 0L,
            properties.gemini.rateLimitCooldownSeconds,
        ).coerceAtLeast(1L)
    }

    private fun baseRedisKey(): String = "${properties.gemini.rateLimitRedisKeyPrefix}:{${properties.gemini.model}}"

    private fun requestsKey(): String = "${baseRedisKey()}:requests"

    private fun blockedUntilKey(): String = "${baseRedisKey()}:blocked-until"

    private fun sequenceKey(): String = "${baseRedisKey()}:sequence"

    private fun baseRedisKeyTtl(): Duration =
        Duration.ofSeconds(
            maxOf(
                properties.gemini.rateLimitWindowSeconds * 2,
                properties.gemini.rateLimitCooldownSeconds * 2,
            ),
        )

    private fun extractRetryDelaySeconds(responseBody: String): Long? =
        RETRY_DELAY_SECONDS_REGEX
            .find(responseBody)
            ?.groupValues
            ?.getOrNull(1)
            ?.toLongOrNull()

    private fun Duration.coerceAtLeastZero(): Duration = if (isNegative) Duration.ZERO else this

    companion object {
        private const val TOO_MANY_REQUESTS_STATUS = 429
        private val RETRY_DELAY_SECONDS_REGEX = Regex("""\"retryDelay\"\s*:\s*\"(\d+)s\"""")
        private val log = logger<RedisGeminiRateLimiter>()

        private val RESERVE_PERMIT_SCRIPT =
            DefaultRedisScript<Long>().apply {
                setScriptText(
                    """
                    local requestsKey = KEYS[1]
                    local blockedUntilKey = KEYS[2]
                    local sequenceKey = KEYS[3]

                    local windowMillis = tonumber(ARGV[1])
                    local maxRequests = tonumber(ARGV[2])
                    local safetyDelayMillis = tonumber(ARGV[3])
                    local baseTtlMillis = tonumber(ARGV[4])

                    local time = redis.call('TIME')
                    local nowMillis = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

                    local pruneBefore = nowMillis - windowMillis - safetyDelayMillis
                    redis.call('ZREMRANGEBYSCORE', requestsKey, '-inf', pruneBefore)

                    local blockedUntilMillis = tonumber(redis.call('GET', blockedUntilKey) or '0')
                    local candidate = nowMillis
                    if blockedUntilMillis > candidate then
                        candidate = blockedUntilMillis
                    end

                    while true do
                        local windowStart = candidate - windowMillis
                        local requestsInWindow =
                            redis.call('ZCOUNT', requestsKey, '(' .. tostring(windowStart), tostring(candidate))

                        if requestsInWindow < maxRequests then
                            local sequence = redis.call('INCR', sequenceKey)
                            local member = tostring(candidate) .. ':' .. tostring(sequence)
                            redis.call('ZADD', requestsKey, candidate, member)

                            local reservationTtlMillis = candidate - nowMillis + windowMillis + safetyDelayMillis
                            local ttlMillis = baseTtlMillis
                            if reservationTtlMillis > ttlMillis then
                                ttlMillis = reservationTtlMillis
                            end
                            redis.call('PEXPIRE', requestsKey, ttlMillis)
                            redis.call('PEXPIRE', sequenceKey, ttlMillis)

                            local delayMillis = candidate - nowMillis
                            if delayMillis < 0 then
                                delayMillis = 0
                            end
                            return delayMillis
                        end

                        local oldest =
                            redis.call(
                                'ZRANGEBYSCORE',
                                requestsKey,
                                '(' .. tostring(windowStart),
                                tostring(candidate),
                                'WITHSCORES',
                                'LIMIT',
                                0,
                                1
                            )
                        if oldest[2] == nil then
                            return 0
                        end

                        candidate = tonumber(oldest[2]) + windowMillis + safetyDelayMillis
                    end
                    """.trimIndent(),
                )
                resultType = Long::class.java
            }

        private val RECORD_BLOCKED_UNTIL_SCRIPT =
            DefaultRedisScript<Long>().apply {
                setScriptText(
                    """
                    local blockedUntilKey = KEYS[1]

                    local newBlockedUntilMillis = tonumber(ARGV[1])
                    local baseTtlMillis = tonumber(ARGV[2])
                    local windowMillis = tonumber(ARGV[3])
                    local safetyDelayMillis = tonumber(ARGV[4])

                    local time = redis.call('TIME')
                    local nowMillis = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

                    local existingBlockedUntilMillis = tonumber(redis.call('GET', blockedUntilKey) or '0')
                    local effectiveBlockedUntilMillis = existingBlockedUntilMillis

                    if newBlockedUntilMillis > existingBlockedUntilMillis then
                        effectiveBlockedUntilMillis = newBlockedUntilMillis
                        redis.call('SET', blockedUntilKey, tostring(effectiveBlockedUntilMillis))

                        local ttlMillis = effectiveBlockedUntilMillis - nowMillis + windowMillis + safetyDelayMillis
                        if ttlMillis < baseTtlMillis then
                            ttlMillis = baseTtlMillis
                        end
                        redis.call('PEXPIRE', blockedUntilKey, ttlMillis)
                    end

                    return effectiveBlockedUntilMillis
                    """.trimIndent(),
                )
                resultType = Long::class.java
            }
    }
}
