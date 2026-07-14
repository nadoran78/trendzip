package com.mztrend.client

interface GeminiRateLimiter {
    fun acquirePermit()

    fun recordRateLimitIfNeeded(exception: Throwable): Boolean
}
