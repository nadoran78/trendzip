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
@Table(name = "trend_feed_keywords")
class TrendFeedKeyword(
    @Column(name = "trend_feed_id", nullable = false)
    var trendFeedId: Long = 0,
    @Column(name = "keyword_id", nullable = false)
    var keywordId: Long = 0,
    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 20)
    var relationType: TrendFeedKeywordRelationType = TrendFeedKeywordRelationType.PRIMARY,
    @Enumerated(EnumType.STRING)
    @Column(name = "feed_section", length = 30)
    var feedSection: FeedSection? = null,
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int = 0,
    @Column
    var score: Int? = null,
    @Column(length = 30)
    var source: String? = null,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
}
