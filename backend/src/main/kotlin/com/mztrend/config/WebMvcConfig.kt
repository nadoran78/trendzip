package com.mztrend.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebMvcConfig(
    private val mediaOperationsApiInterceptor: MediaOperationsApiInterceptor,
) : WebMvcConfigurer {
    override fun addInterceptors(registry: InterceptorRegistry) {
        registry
            .addInterceptor(mediaOperationsApiInterceptor)
            .addPathPatterns("/api/ops/media/**")
    }
}
