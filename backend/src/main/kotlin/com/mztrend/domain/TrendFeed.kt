package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "trend_feeds")
class TrendFeed(
    @Column(name = "youtube_video_id", nullable = false, length = 50)
    var youtubeVideoId: String = "",
    @Column(nullable = false, length = 300)
    var title: String = "",
    @Column(name = "channel_id", length = 100)
    var channelId: String? = null,
    @Column(name = "channel_name", nullable = false, length = 150)
    var channelName: String = "",
    @Column(name = "channel_category", length = 50)
    var channelCategory: String? = null,
    @Column(name = "channel_subscriber_count")
    var channelSubscriberCount: Long? = null,
    @Column(name = "thumbnail_url", length = 500)
    var thumbnailUrl: String? = null,
    @Column(name = "view_count")
    var viewCount: Long? = null,
    @Column(name = "published_at")
    var publishedAt: LocalDateTime? = null,
    @Column(name = "duration_seconds")
    var durationSeconds: Int? = null,
    @Column(length = 30)
    var badge: String? = null,
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
