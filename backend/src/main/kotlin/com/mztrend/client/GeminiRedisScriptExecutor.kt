package com.mztrend.client

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.RedisScript
import org.springframework.stereotype.Component

interface GeminiRedisScriptExecutor {
    fun execute(
        script: RedisScript<Long>,
        keys: List<String>,
        args: List<String>,
    ): Long
}

@Component
class StringRedisGeminiScriptExecutor(
    private val redisTemplate: StringRedisTemplate,
) : GeminiRedisScriptExecutor {
    override fun execute(
        script: RedisScript<Long>,
        keys: List<String>,
        args: List<String>,
    ): Long = redisTemplate.execute(script, keys, *args.toTypedArray()) ?: 0L
}
