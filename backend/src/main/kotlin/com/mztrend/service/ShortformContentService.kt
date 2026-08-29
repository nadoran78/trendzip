package com.mztrend.service

import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentKeywordSnapshot
import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.command.ShortformContentKeywordSnapshotRepository
import com.mztrend.repository.command.ShortformContentRepository
import com.mztrend.repository.query.ShortformContentQueryRepository
import com.mztrend.repository.query.dto.ShortformContentQueryResult
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime

@Service
class ShortformContentService(
    private val shortformContentRepository: ShortformContentRepository,
    private val shortformContentKeywordSnapshotRepository: ShortformContentKeywordSnapshotRepository,
    private val shortformContentQueryRepository: ShortformContentQueryRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getRecentContents(from: LocalDateTime): List<ShortformContentQueryResult> = shortformContentQueryRepository.findRecent(from)

    @Transactional
    fun reserveDraft(command: ReserveShortformDraftCommand): ShortformContentQueryResult {
        command.validateKeywordUniqueness()
        checkDuplicate(command)

        val now = LocalDateTime.now(clock)

        val savedShortformContent =
            try {
                shortformContentRepository.saveAndFlush(command.toEntity(now))
            } catch (_: DataIntegrityViolationException) {
                throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_CONTENT)
            }

        val shortformContentId =
            requireNotNull(savedShortformContent.id) {
                "Saved shortform content must have an ID."
            }
        shortformContentKeywordSnapshotRepository.saveAllAndFlush(command.toKeywordSnapshots(shortformContentId))

        return shortformContentQueryRepository.findById(shortformContentId)
            ?: throw MzTrendException(ErrorCode.INTERNAL_ERROR)
    }

    private fun checkDuplicate(command: ReserveShortformDraftCommand) {
        if (shortformContentRepository.existsByContentHash(command.contentHash)) {
            throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_CONTENT)
        }

        if (shortformContentRepository.existsByPlatformAndEventKeyAndStatusIn(
                platform = command.platform,
                eventKey = command.eventKey,
                statuses = DUPLICATE_BLOCKING_STATUSES,
            )
        ) {
            throw MzTrendException(ErrorCode.DUPLICATE_MEDIA_CONTENT)
        }
    }

    private fun ReserveShortformDraftCommand.toEntity(now: LocalDateTime): ShortformContent =
        ShortformContent(
            platform = this.platform,
            status = ShortformContentStatus.DRAFT,
            primaryKeywordId = this.primaryKeywordId,
            primaryKeywordWord = this.primaryKeywordWord,
            sourceGeneration = this.sourceGeneration,
            editorialFormat = this.editorialFormat,
            topicKey = this.topicKey,
            eventKey = this.eventKey,
            audienceAngle = this.audienceAngle,
            selectionReason = this.selectionReason,
            title = this.title,
            contentHash = this.contentHash,
            sourceCrawlRunId = this.sourceCrawlRunId,
            selectedAt = now,
        )

    private fun ReserveShortformDraftCommand.toKeywordSnapshots(shortformContentId: Long): List<ShortformContentKeywordSnapshot> =
        buildList {
            add(
                ShortformContentKeywordSnapshot(
                    shortformContentId = shortformContentId,
                    keywordId = primaryKeywordId,
                    keywordWord = primaryKeywordWord,
                    role = ShortformKeywordRole.PRIMARY,
                    displayOrder = 0,
                ),
            )
            relatedKeywords.forEachIndexed { index, relatedKeyword ->
                add(
                    ShortformContentKeywordSnapshot(
                        shortformContentId = shortformContentId,
                        keywordId = relatedKeyword.keywordId,
                        keywordWord = relatedKeyword.keywordWord,
                        role = ShortformKeywordRole.RELATED,
                        displayOrder = index + 1,
                    ),
                )
            }
        }

    private fun ReserveShortformDraftCommand.validateKeywordUniqueness() {
        val relatedKeywordIds = relatedKeywords.map { it.keywordId }
        val relatedKeywordWords = relatedKeywords.map { it.keywordWord }

        val hasDuplicateId =
            relatedKeywordIds.size != relatedKeywordIds.distinct().size ||
                primaryKeywordId in relatedKeywordIds
        val hasDuplicateWord =
            relatedKeywordWords.size != relatedKeywordWords.distinct().size ||
                primaryKeywordWord in relatedKeywordWords

        if (hasDuplicateId || hasDuplicateWord) {
            throw MzTrendException(ErrorCode.INVALID_REQUEST)
        }
    }

    @Transactional
    fun updateStatus(
        id: Long,
        command: UpdateShortformContentStatusCommand,
    ): ShortformContentQueryResult {
        val content =
            shortformContentRepository.findById(id).orElseThrow {
                MzTrendException(ErrorCode.NOT_FOUND)
            }

        if (command.status in ARTIFACT_MANAGED_TARGET_STATUSES ||
            content.status == ShortformContentStatus.REVIEW_REQUIRED &&
            command.status in REVIEW_DECISION_TARGET_STATUSES
        ) {
            throw MzTrendException(ErrorCode.INVALID_STATE_TRANSITION)
        }

        if (!content.canTransitionTo(command.status)) {
            throw MzTrendException(ErrorCode.INVALID_STATE_TRANSITION)
        }

        try {
            content.transitionTo(
                target = command.status,
                occurredAt = LocalDateTime.now(clock),
                externalContentId = command.externalContentId,
            )
        } catch (exception: IllegalArgumentException) {
            throw MzTrendException(ErrorCode.INVALID_REQUEST, exception.message ?: ErrorCode.INVALID_REQUEST.defaultMessage)
        }

        shortformContentRepository.saveAndFlush(content)
        return shortformContentQueryRepository.findById(id)
            ?: throw MzTrendException(ErrorCode.INTERNAL_ERROR)
    }

    companion object {
        private val ARTIFACT_MANAGED_TARGET_STATUSES =
            setOf(
                ShortformContentStatus.RENDERED,
                ShortformContentStatus.REVIEW_REQUIRED,
                ShortformContentStatus.APPROVED,
            )
        private val REVIEW_DECISION_TARGET_STATUSES =
            setOf(
                ShortformContentStatus.APPROVED,
                ShortformContentStatus.NEEDS_REVISION,
                ShortformContentStatus.REJECTED,
            )

        val DUPLICATE_BLOCKING_STATUSES =
            setOf(
                ShortformContentStatus.DRAFT,
                ShortformContentStatus.RENDERED,
                ShortformContentStatus.REVIEW_REQUIRED,
                ShortformContentStatus.APPROVED,
                ShortformContentStatus.UPLOADED_PRIVATE,
                ShortformContentStatus.SCHEDULED,
                ShortformContentStatus.PUBLISHED,
                ShortformContentStatus.HOLD,
                ShortformContentStatus.NEEDS_REVISION,
            )
    }
}
