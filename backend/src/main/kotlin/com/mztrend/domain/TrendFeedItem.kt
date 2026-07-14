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
@Table(name = "trend_feed_items")
class TrendFeedItem(
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    var generation: Generation = Generation.TEEN,
    @Column(name = "trend_video_id", nullable = false)
    var trendVideoId: Long = 0,
    @Column(name = "primary_keyword_id", nullable = false)
    var primaryKeywordId: Long = 0,
    @Enumerated(EnumType.STRING)
    @Column(name = "feed_section", length = 30)
    var feedSection: FeedSection? = null,
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int = 0,
    @Column
    var score: Int? = null,
    @Column(length = 30)
    var badge: String? = null,
    @Column(length = 30)
    var source: String? = null,
    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,
    @Column(name = "collected_at", nullable = false)
    var collectedAt: LocalDateTime = LocalDateTime.now(),
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()

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
}
