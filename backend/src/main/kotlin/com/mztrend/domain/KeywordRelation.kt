package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "keyword_relations")
class KeywordRelation(
    @Column(name = "keyword_id", nullable = false)
    var keywordId: Long = 0,
    @Column(name = "related_keyword_id", nullable = false)
    var relatedKeywordId: Long = 0,
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int = 0,
    @Column
    var score: Int? = null,
    @Column(length = 30)
    var source: String? = null,
    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "deactivated_at")
    var deactivatedAt: LocalDateTime? = null
}
