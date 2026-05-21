package com.mztrend.controller

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.dto.KeywordListResponse
import com.mztrend.domain.Generation
import com.mztrend.service.KeywordService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/keywords")
class KeywordController(
    private val keywordService: KeywordService,
) {
    @GetMapping
    fun getKeywords(
        @RequestParam generation: Generation,
    ): ResponseWrapper<KeywordListResponse> = ResponseWrapper.success(keywordService.getKeywords(generation))
}
