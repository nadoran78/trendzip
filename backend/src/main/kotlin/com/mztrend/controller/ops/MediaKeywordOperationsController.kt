package com.mztrend.controller.ops

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.ops.dto.MediaKeywordDetailResponse
import com.mztrend.service.MediaKeywordOperationsService
import io.swagger.v3.oas.annotations.Hidden
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@Hidden
@RestController
@RequestMapping("/api/ops/media/keywords")
class MediaKeywordOperationsController(
    private val mediaKeywordOperationsService: MediaKeywordOperationsService,
) {
    @GetMapping("/{id}")
    fun getKeywordDetail(
        @PathVariable id: Long,
    ): ResponseWrapper<MediaKeywordDetailResponse> = ResponseWrapper.success(mediaKeywordOperationsService.getKeywordDetail(id))
}
