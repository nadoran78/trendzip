package com.mztrend.config

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.cache.RedisCacheConfiguration
import org.springframework.data.redis.cache.RedisCacheManager
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer
import org.springframework.data.redis.serializer.RedisSerializationContext
import org.springframework.data.redis.serializer.StringRedisSerializer
import java.time.Duration

@Configuration
@EnableCaching
class CacheConfig {
    @Bean
    @ConditionalOnProperty(name = ["spring.cache.type"], havingValue = "redis")
    fun redisCacheManager(
        redisConnectionFactory: RedisConnectionFactory,
        objectMapper: ObjectMapper,
    ): RedisCacheManager {
        val valueSerializer =
            GenericJackson2JsonRedisSerializer
                .builder()
                .objectMapper(objectMapper.copy())
                .defaultTyping(true)
                .build()

        val defaultConfiguration =
            RedisCacheConfiguration
                .defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer))

        val cacheConfigurations =
            mapOf(
                CacheNames.KEYWORDS to defaultConfiguration.entryTtl(Duration.ofHours(24)),
                CacheNames.FEED to defaultConfiguration.entryTtl(Duration.ofHours(6)),
                CacheNames.VIDEOS to defaultConfiguration.entryTtl(Duration.ofHours(6)),
            )

        return RedisCacheManager
            .builder(redisConnectionFactory)
            .cacheDefaults(defaultConfiguration)
            .withInitialCacheConfigurations(cacheConfigurations)
            .build()
    }
}

object CacheNames {
    const val KEYWORDS = "keywords"
    const val FEED = "feed"
    const val VIDEOS = "videos"
}
