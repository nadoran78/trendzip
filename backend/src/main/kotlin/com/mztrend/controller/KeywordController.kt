package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.dto.KeywordListResponse
import com.mztrend.domain.Generation
import com.mztrend.service.KeywordService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@Tag(name = "Keyword", description = "세대별 트렌드 키워드 API")
@RestController
@RequestMapping("/api/keywords")
class KeywordController(
    private val keywordService: KeywordService,
) {
    @Operation(
        summary = "세대별 키워드 목록 조회",
        description = "선택한 세대의 트렌드 키워드 순위와 점수, 카테고리 정보를 조회합니다.",
    )
    @GetMapping
    fun getKeywords(
        @Parameter(description = "조회할 세대. TEEN은 10대, TWENTY는 20대입니다.", example = "TEEN", required = true)
        @RequestParam generation: Generation,
    ): ResponseWrapper<KeywordListResponse> = ResponseWrapper.success(keywordService.getKeywords(generation))
}
