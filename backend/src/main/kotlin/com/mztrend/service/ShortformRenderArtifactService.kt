package com.mztrend.service

import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformRenderArtifact
import com.mztrend.domain.ShortformReviewDecision
import com.mztrend.domain.ShortformReviewDecisionType
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.command.ShortformContentRepository
import com.mztrend.repository.command.ShortformRenderArtifactRepository
import com.mztrend.repository.command.ShortformReviewDecisionRepository
import com.mztrend.repository.query.ShortformContentQueryRepository
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

@Service
class ShortformRenderArtifactService(
    private val shortformContentRepository: ShortformContentRepository,
    private val shortformRenderArtifactRepository: ShortformRenderArtifactRepository,
    private val shortformReviewDecisionRepository: ShortformReviewDecisionRepository,
    private val shortformContentQueryRepository: ShortformContentQueryRepository,
    private val clock: Clock,
) {
    @Transactional
    fun registerRenderArtifact(
        shortformContentId: Long,
        command: RegisterShortformRenderArtifactCommand,
    ): RegisterShortformRenderArtifactResult {
        val content = findContentForUpdate(shortformContentId)
        validateRenderRegistration(content, command)

        if (shortformRenderArtifactRepository.existsByArtifactHash(command.artifactHash)) {
            throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_RENDER_ARTIFACT)
        }

        val artifact =
            try {
                shortformRenderArtifactRepository.saveAndFlush(command.toEntity(shortformContentId))
            } catch (_: DataIntegrityViolationException) {
                throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_RENDER_ARTIFACT)
            }

        val now = LocalDateTime.now(clock)
        if (content.status == ShortformContentStatus.NEEDS_REVISION) {
            content.transitionTo(ShortformContentStatus.DRAFT, now, null)
        }
        content.transitionTo(ShortformContentStatus.RENDERED, now, null)
        content.transitionTo(ShortformContentStatus.REVIEW_REQUIRED, now, null)
        shortformContentRepository.saveAndFlush(content)

        return RegisterShortformRenderArtifactResult(
            content = findContentResult(shortformContentId),
            artifact = artifact.toResult(),
        )
    }

    @Transactional
    fun reviewRenderArtifact(
        shortformContentId: Long,
        command: ReviewShortformRenderArtifactCommand,
    ): ReviewShortformRenderArtifactResult {
        val content = findContentForUpdate(shortformContentId)
        if (content.status != ShortformContentStatus.REVIEW_REQUIRED) {
            throw MzTrendException(ErrorCode.INVALID_STATE_TRANSITION)
        }

        val artifact =
            shortformRenderArtifactRepository.findByArtifactHash(command.artifactHash)
                ?: throw MzTrendException(ErrorCode.NOT_FOUND)
        val latestArtifact =
            shortformRenderArtifactRepository.findTopByShortformContentIdOrderByIdDesc(shortformContentId)
                ?: throw MzTrendException(ErrorCode.NOT_FOUND)

        if (artifact.shortformContentId != shortformContentId || artifact.id != latestArtifact.id) {
            throw MzTrendException(ErrorCode.STALE_MEDIA_RENDER_ARTIFACT)
        }

        val artifactId = requireNotNull(artifact.id) { "Persisted render artifact must have an ID." }
        if (shortformReviewDecisionRepository.existsByRenderArtifactId(artifactId)) {
            throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_REVIEW_DECISION)
        }

        val review =
            try {
                shortformReviewDecisionRepository.saveAndFlush(
                    ShortformReviewDecision(
                        shortformContentId = shortformContentId,
                        renderArtifactId = artifactId,
                        decision = command.decision,
                        reviewer = command.reviewer,
                        reason = command.reason,
                    ),
                )
            } catch (_: DataIntegrityViolationException) {
                throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_REVIEW_DECISION)
            }

        content.transitionTo(command.decision.toContentStatus(), LocalDateTime.now(clock), null)
        shortformContentRepository.saveAndFlush(content)

        return ReviewShortformRenderArtifactResult(
            content = findContentResult(shortformContentId),
            review = review.toResult(command.artifactHash),
        )
    }

    private fun findContentForUpdate(shortformContentId: Long): ShortformContent =
        shortformContentRepository.findByIdForUpdate(shortformContentId)
            ?: throw MzTrendException(ErrorCode.NOT_FOUND)

    private fun validateRenderRegistration(
        content: ShortformContent,
        command: RegisterShortformRenderArtifactCommand,
    ) {
        if (content.contentHash != command.contentHash) {
            throw MzTrendException(ErrorCode.INVALID_REQUEST, "The render content hash does not match the draft.")
        }
        if (content.status !in RENDERABLE_STATUSES) {
            throw MzTrendException(ErrorCode.INVALID_STATE_TRANSITION)
        }
    }

    private fun findContentResult(shortformContentId: Long) =
        shortformContentQueryRepository.findById(shortformContentId)
            ?: throw MzTrendException(ErrorCode.INTERNAL_ERROR)

    private fun RegisterShortformRenderArtifactCommand.toEntity(shortformContentId: Long) =
        ShortformRenderArtifact(
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
        )

    private fun ShortformRenderArtifact.toResult() =
        ShortformRenderArtifactResult(
            id = requireNotNull(id),
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

    private fun ShortformReviewDecision.toResult(artifactHash: String) =
        ShortformReviewDecisionResult(
            id = requireNotNull(id),
            shortformContentId = shortformContentId,
            renderArtifactId = renderArtifactId,
            artifactHash = artifactHash,
            decision = decision,
            reviewer = reviewer,
            reason = reason,
            createdAt = createdAt,
        )

    private fun ShortformReviewDecisionType.toContentStatus(): ShortformContentStatus =
        when (this) {
            ShortformReviewDecisionType.APPROVED -> ShortformContentStatus.APPROVED
            ShortformReviewDecisionType.NEEDS_REVISION -> ShortformContentStatus.NEEDS_REVISION
            ShortformReviewDecisionType.REJECTED -> ShortformContentStatus.REJECTED
        }

    private companion object {
        val RENDERABLE_STATUSES =
            setOf(
                ShortformContentStatus.DRAFT,
                ShortformContentStatus.NEEDS_REVISION,
            )
    }
}
