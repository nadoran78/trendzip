package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "shortform_contents")
class ShortformContent(
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var platform: ShortformPlatform = ShortformPlatform.YOUTUBE,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var status: ShortformContentStatus = ShortformContentStatus.DRAFT,
    @Column(name = "primary_keyword_id", nullable = false)
    var primaryKeywordId: Long = 0,
    @Column(name = "primary_keyword_word", nullable = false, length = 100)
    var primaryKeywordWord: String = "",
    @Enumerated(EnumType.STRING)
    @Column(name = "source_generation", nullable = false, length = 10)
    var sourceGeneration: ShortformSourceGeneration = ShortformSourceGeneration.TEEN,
    @Enumerated(EnumType.STRING)
    @Column(name = "editorial_format", nullable = false, length = 40)
    var editorialFormat: ShortformEditorialFormat = ShortformEditorialFormat.WHY_NOW,
    @Column(name = "topic_key", nullable = false, length = 200)
    var topicKey: String = "",
    @Column(name = "event_key", nullable = false, length = 200)
    var eventKey: String = "",
    @Column(name = "audience_angle", nullable = false, length = 500)
    var audienceAngle: String = "",
    @Column(name = "selection_reason", nullable = false, columnDefinition = "TEXT")
    var selectionReason: String = "",
    @Column(nullable = false, length = 100)
    var title: String = "",
    @Column(name = "content_hash", nullable = false, length = 64)
    var contentHash: String = "",
    @Column(name = "source_crawl_run_id", nullable = false)
    var sourceCrawlRunId: Long = 0,
    @Column(name = "selected_at", nullable = false)
    var selectedAt: LocalDateTime = LocalDateTime.now(),
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "external_content_id", length = 100)
    var externalContentId: String? = null

    @Column(name = "rendered_at")
    var renderedAt: LocalDateTime? = null

    @Column(name = "uploaded_at")
    var uploadedAt: LocalDateTime? = null

    @Column(name = "published_at")
    var publishedAt: LocalDateTime? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()

    fun canTransitionTo(target: ShortformContentStatus): Boolean = target in allowedTransitions.getValue(status)

    fun transitionTo(
        target: ShortformContentStatus,
        occurredAt: LocalDateTime,
        externalContentId: String?,
    ) {
        require(canTransitionTo(target)) { "Cannot transition shortform content from $status to $target." }

        status = target
        when (target) {
            ShortformContentStatus.RENDERED -> renderedAt = occurredAt
            ShortformContentStatus.UPLOADED_PRIVATE -> {
                require(!externalContentId.isNullOrBlank()) { "External content ID is required after upload." }
                this.externalContentId = externalContentId
                uploadedAt = occurredAt
            }
            ShortformContentStatus.PUBLISHED -> {
                if (!externalContentId.isNullOrBlank()) {
                    this.externalContentId = externalContentId
                }
                require(!this.externalContentId.isNullOrBlank()) { "External content ID is required before publication." }
                publishedAt = occurredAt
            }
            else -> Unit
        }
    }

    @PrePersist
    fun prePersist() {
        val now = LocalDateTime.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = LocalDateTime.now()
    }

    private companion object {
        val allowedTransitions =
            mapOf(
                ShortformContentStatus.DRAFT to
                    setOf(
                        ShortformContentStatus.RENDERED,
                        ShortformContentStatus.HOLD,
                        ShortformContentStatus.REJECTED,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.RENDERED to
                    setOf(
                        ShortformContentStatus.REVIEW_REQUIRED,
                        ShortformContentStatus.NEEDS_REVISION,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.REVIEW_REQUIRED to
                    setOf(
                        ShortformContentStatus.APPROVED,
                        ShortformContentStatus.NEEDS_REVISION,
                        ShortformContentStatus.REJECTED,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.APPROVED to
                    setOf(
                        ShortformContentStatus.UPLOADED_PRIVATE,
                        ShortformContentStatus.NEEDS_REVISION,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.UPLOADED_PRIVATE to
                    setOf(
                        ShortformContentStatus.SCHEDULED,
                        ShortformContentStatus.PUBLISHED,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.SCHEDULED to
                    setOf(
                        ShortformContentStatus.PUBLISHED,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.PUBLISHED to setOf(ShortformContentStatus.RETIRED),
                ShortformContentStatus.HOLD to
                    setOf(
                        ShortformContentStatus.DRAFT,
                        ShortformContentStatus.REJECTED,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.NEEDS_REVISION to
                    setOf(
                        ShortformContentStatus.DRAFT,
                        ShortformContentStatus.RETIRED,
                    ),
                ShortformContentStatus.REJECTED to emptySet(),
                ShortformContentStatus.RETIRED to emptySet(),
            )
    }
}
