package com.mztrend.controller.ops

import com.mztrend.common.ResponseWrapper
import com.mztrend.controller.ops.dto.RegisterShortformRenderArtifactRequest
import com.mztrend.controller.ops.dto.RegisterShortformRenderArtifactResponse
import com.mztrend.controller.ops.dto.ReserveShortformDraftRequest
import com.mztrend.controller.ops.dto.ReviewShortformRenderArtifactRequest
import com.mztrend.controller.ops.dto.ReviewShortformRenderArtifactResponse
import com.mztrend.controller.ops.dto.ShortformContentListResponse
import com.mztrend.controller.ops.dto.ShortformContentResponse
import com.mztrend.controller.ops.dto.UpdateShortformContentStatusRequest
import com.mztrend.controller.ops.dto.toCommand
import com.mztrend.controller.ops.dto.toResponse
import com.mztrend.service.ShortformContentService
import com.mztrend.service.ShortformRenderArtifactService
import io.swagger.v3.oas.annotations.Hidden
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@Hidden
@RestController
@RequestMapping("/api/ops/media/contents")
class ShortformContentOperationsController(
    private val shortformContentService: ShortformContentService,
    private val shortformRenderArtifactService: ShortformRenderArtifactService,
) {
    @GetMapping
    fun getRecentContents(
        @RequestParam
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        from: LocalDateTime,
    ): ResponseWrapper<ShortformContentListResponse> =
        ResponseWrapper.success(
            ShortformContentListResponse(
                contents = shortformContentService.getRecentContents(from).map { it.toResponse() },
            ),
        )

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun reserveDraft(
        @Valid @RequestBody request: ReserveShortformDraftRequest,
    ): ResponseWrapper<ShortformContentResponse> =
        ResponseWrapper.success(shortformContentService.reserveDraft(request.toCommand()).toResponse())

    @PostMapping("/{id}/render-artifacts")
    @ResponseStatus(HttpStatus.CREATED)
    fun registerRenderArtifact(
        @PathVariable id: Long,
        @Valid @RequestBody request: RegisterShortformRenderArtifactRequest,
    ): ResponseWrapper<RegisterShortformRenderArtifactResponse> =
        ResponseWrapper.success(
            shortformRenderArtifactService.registerRenderArtifact(id, request.toCommand()).toResponse(),
        )

    @PostMapping("/{id}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    fun reviewRenderArtifact(
        @PathVariable id: Long,
        @Valid @RequestBody request: ReviewShortformRenderArtifactRequest,
    ): ResponseWrapper<ReviewShortformRenderArtifactResponse> =
        ResponseWrapper.success(
            shortformRenderArtifactService.reviewRenderArtifact(id, request.toCommand()).toResponse(),
        )

    @PatchMapping("/{id}")
    fun updateStatus(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateShortformContentStatusRequest,
    ): ResponseWrapper<ShortformContentResponse> =
        ResponseWrapper.success(shortformContentService.updateStatus(id, request.toCommand()).toResponse())
}
