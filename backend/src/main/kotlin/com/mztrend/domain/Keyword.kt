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
@Table(name = "keywords")
class Keyword(
    @Column(nullable = false, length = 100)
    var word: String = "",
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    var generation: Generation = Generation.TEEN,
    @Column(length = 50)
    var category: String? = null,
    @Column(name = "current_rank")
    var currentRank: Int? = null,
    @Column(name = "trend_score")
    var trendScore: Long? = null,
    @Enumerated(EnumType.STRING)
    @Column(name = "rank_trend", length = 10)
    var rankTrend: RankTrend? = null,
    @Column(name = "rank_delta")
    var rankDelta: Int? = null,
    @Column(columnDefinition = "TEXT")
    var explain: String? = null,
    @Column(name = "explained_at")
    var explainedAt: LocalDateTime? = null,
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
