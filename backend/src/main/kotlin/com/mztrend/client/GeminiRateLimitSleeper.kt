package com.mztrend.client

import org.springframework.stereotype.Component
import java.time.Duration

fun interface GeminiRateLimitSleeper {
    fun sleep(delay: Duration)
}

@Component
class ThreadGeminiRateLimitSleeper : GeminiRateLimitSleeper {
    override fun sleep(delay: Duration) {
        try {
            Thread.sleep(delay.toMillis())
        } catch (exception: InterruptedException) {
            Thread.currentThread().interrupt()
            throw IllegalStateException("Interrupted while waiting for Gemini rate limit permit.", exception)
        }
    }
}
