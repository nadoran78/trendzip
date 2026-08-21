package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "shortform_content_keyword_snapshots")
class ShortformContentKeywordSnapshot(
    @Column(name = "shortform_content_id", nullable = false)
    var shortformContentId: Long = 0,
    @Column(name = "keyword_id", nullable = false)
    var keywordId: Long = 0,
    @Column(name = "keyword_word", nullable = false, length = 100)
    var keywordWord: String = "",
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    var role: ShortformKeywordRole = ShortformKeywordRole.RELATED,
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int = 0,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
}
