package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.dto.FeedResponse
import com.mztrend.domain.Generation
import com.mztrend.service.FeedService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@Tag(name = "Feed", description = "세대별 유튜브 트렌드 피드 API")
@RestController
@RequestMapping("/api/feed")
class FeedController(
    private val feedService: FeedService,
) {
    @Operation(
        summary = "세대별 피드 조회",
        description = "선택한 세대의 트렌드 키워드와 연결된 대표 유튜브 영상을 조회합니다.",
    )
    @GetMapping
    fun getFeed(
        @Parameter(description = "조회할 세대. TEEN은 10대, TWENTY는 20대입니다.", example = "TEEN", required = true)
        @RequestParam generation: Generation,
    ): ResponseWrapper<FeedResponse> = ResponseWrapper.success(feedService.getFeed(generation))
}
