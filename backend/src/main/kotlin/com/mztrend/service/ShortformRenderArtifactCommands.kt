package com.mztrend.service

import com.mztrend.domain.ShortformReviewDecisionType

data class RegisterShortformRenderArtifactCommand(
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
)

data class ReviewShortformRenderArtifactCommand(
    val artifactHash: String,
    val decision: ShortformReviewDecisionType,
    val reviewer: String,
    val reason: String,
)
