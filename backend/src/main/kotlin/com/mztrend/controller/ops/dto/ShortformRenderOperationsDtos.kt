package com.mztrend.controller.ops.dto

import com.mztrend.domain.ShortformReviewDecisionType
import com.mztrend.service.RegisterShortformRenderArtifactCommand
import com.mztrend.service.RegisterShortformRenderArtifactResult
import com.mztrend.service.ReviewShortformRenderArtifactCommand
import com.mztrend.service.ReviewShortformRenderArtifactResult
import com.mztrend.service.ShortformRenderArtifactResult
import com.mztrend.service.ShortformReviewDecisionResult
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class RegisterShortformRenderArtifactRequest(
    @field:Pattern(regexp = SHA256_PATTERN)
    val contentHash: String,
    @field:Pattern(regexp = SHA256_PATTERN)
    val artifactHash: String,
    @field:Pattern(regexp = SHA256_PATTERN)
    val sourceManifestHash: String,
    @field:Pattern(regexp = SHA256_PATTERN)
    val audioManifestHash: String,
    @field:Pattern(regexp = SHA256_PATTERN)
    val renderPropsHash: String,
    @field:Pattern(regexp = SHA256_PATTERN)
    val videoHash: String,
    @field:NotBlank
    @field:Size(max = 100)
    val ttsModel: String,
    @field:NotBlank
    @field:Size(max = 100)
    val ttsVoice: String,
    @field:Positive
    val durationMillis: Long,
    @field:Positive
    val width: Int,
    @field:Positive
    val height: Int,
    @field:Positive
    val fps: Int,
    @field:NotBlank
    @field:Size(max = 30)
    val videoCodec: String,
    @field:NotBlank
    @field:Size(max = 30)
    val audioCodec: String,
)

data class ReviewShortformRenderArtifactRequest(
    @field:Pattern(regexp = SHA256_PATTERN)
    val artifactHash: String,
    val decision: ShortformReviewDecisionType,
    @field:NotBlank
    @field:Size(max = 100)
    val reviewer: String,
    @field:NotBlank
    @field:Size(max = 2_000)
    val reason: String,
)

data class RegisterShortformRenderArtifactResponse(
    val content: ShortformContentResponse,
    val artifact: ShortformRenderArtifactResponse,
)

data class ShortformRenderArtifactResponse(
    val id: Long,
    val shortformContentId: Long,
    val contentHash: String,
    val artifactHash: String,
    val sourceManifestHash: String,
    val audioManifestHash: String,
    val renderPropsHash: String,
    val videoHash: String,
    val ttsModel: String,
    val ttsVoice: String,
    val durationMillis: Long,
    val width: Int,
    val height: Int,
    val fps: Int,
    val videoCodec: String,
    val audioCodec: String,
    val createdAt: LocalDateTime,
)

data class ReviewShortformRenderArtifactResponse(
    val content: ShortformContentResponse,
    val review: ShortformReviewDecisionResponse,
)

data class ShortformReviewDecisionResponse(
    val id: Long,
    val shortformContentId: Long,
    val renderArtifactId: Long,
    val artifactHash: String,
    val decision: ShortformReviewDecisionType,
    val reviewer: String,
    val reason: String,
    val createdAt: LocalDateTime,
)

fun RegisterShortformRenderArtifactRequest.toCommand() =
    RegisterShortformRenderArtifactCommand(
        contentHash = contentHash,
        artifactHash = artifactHash,
        sourceManifestHash = sourceManifestHash,
        audioManifestHash = audioManifestHash,
        renderPropsHash = renderPropsHash,
        videoHash = videoHash,
        ttsModel = ttsModel,
        ttsVoice = ttsVoice,
        durationMillis = durationMillis,
        width = width,
        height = height,
        fps = fps,
        videoCodec = videoCodec,
        audioCodec = audioCodec,
    )

fun ReviewShortformRenderArtifactRequest.toCommand() =
    ReviewShortformRenderArtifactCommand(
        artifactHash = artifactHash,
        decision = decision,
        reviewer = reviewer,
        reason = reason,
    )

fun RegisterShortformRenderArtifactResult.toResponse() =
    RegisterShortformRenderArtifactResponse(
        content = content.toResponse(),
        artifact = artifact.toResponse(),
    )

fun ReviewShortformRenderArtifactResult.toResponse() =
    ReviewShortformRenderArtifactResponse(
        content = content.toResponse(),
        review = review.toResponse(),
    )

private fun ShortformRenderArtifactResult.toResponse() =
    ShortformRenderArtifactResponse(
        id = id,
        shortformContentId = shortformContentId,
        contentHash = contentHash,
        artifactHash = artifactHash,
        sourceManifestHash = sourceManifestHash,
        audioManifestHash = audioManifestHash,
        renderPropsHash = renderPropsHash,
        videoHash = videoHash,
        ttsModel = ttsModel,
        ttsVoice = ttsVoice,
        durationMillis = durationMillis,
        width = width,
        height = height,
        fps = fps,
        videoCodec = videoCodec,
        audioCodec = audioCodec,
        createdAt = createdAt,
    )

private fun ShortformReviewDecisionResult.toResponse() =
    ShortformReviewDecisionResponse(
        id = id,
        shortformContentId = shortformContentId,
        renderArtifactId = renderArtifactId,
        artifactHash = artifactHash,
        decision = decision,
        reviewer = reviewer,
        reason = reason,
        createdAt = createdAt,
    )

private const val SHA256_PATTERN = "^[0-9a-f]{64}$"
