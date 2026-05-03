package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime

@Entity
@Table(name = "trend_explains")
class TrendExplain(
    @Column(name = "keyword_id", nullable = false)
    var keywordId: Long = 0,
    @Column(nullable = false, columnDefinition = "TEXT")
    var explain: String = "",
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "source_urls", columnDefinition = "TEXT ARRAY")
    var sourceUrls: Array<String> = emptyArray(),
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "generated_at", nullable = false)
    var generatedAt: LocalDateTime = LocalDateTime.now()
}
