package com.mztrend.service

import com.mztrend.domain.ShortformReviewDecisionType
import com.mztrend.repository.query.dto.ShortformContentQueryResult
import java.time.LocalDateTime

data class RegisterShortformRenderArtifactResult(
    val content: ShortformContentQueryResult,
    val artifact: ShortformRenderArtifactResult,
)

data class ShortformRenderArtifactResult(
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

data class ReviewShortformRenderArtifactResult(
    val content: ShortformContentQueryResult,
    val review: ShortformReviewDecisionResult,
)

data class ShortformReviewDecisionResult(
    val id: Long,
    val shortformContentId: Long,
    val renderArtifactId: Long,
    val artifactHash: String,
    val decision: ShortformReviewDecisionType,
    val reviewer: String,
    val reason: String,
    val createdAt: LocalDateTime,
)
