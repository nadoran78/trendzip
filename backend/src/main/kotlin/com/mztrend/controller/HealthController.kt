package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController {
    @GetMapping("/api/health")
    fun health(): ResponseWrapper<HealthResponse> = ResponseWrapper.success(HealthResponse(status = "UP"))
}

data class HealthResponse(
    val status: String,
)
