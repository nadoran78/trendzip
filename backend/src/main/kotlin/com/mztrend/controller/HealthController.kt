package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@Tag(name = "Health", description = "서비스 상태 확인 API")
@RestController
class HealthController {
    @Operation(summary = "헬스 체크", description = "백엔드 애플리케이션이 응답 가능한 상태인지 확인합니다.")
    @GetMapping("/api/health")
    fun health(): ResponseWrapper<HealthResponse> = ResponseWrapper.success(HealthResponse(status = "UP"))
}

data class HealthResponse(
    val status: String,
)
