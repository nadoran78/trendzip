package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "shortform_review_decisions")
class ShortformReviewDecision(
    @Column(name = "shortform_content_id", nullable = false)
    var shortformContentId: Long = 0,
    @Column(name = "render_artifact_id", nullable = false)
    var renderArtifactId: Long = 0,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var decision: ShortformReviewDecisionType = ShortformReviewDecisionType.REJECTED,
    @Column(nullable = false, length = 100)
    var reviewer: String = "",
    @Column(nullable = false, columnDefinition = "TEXT")
    var reason: String = "",
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @PrePersist
    fun prePersist() {
        createdAt = LocalDateTime.now()
    }
}
