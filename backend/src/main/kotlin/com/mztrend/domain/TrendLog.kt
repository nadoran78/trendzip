package com.mztrend.domain

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "trend_logs")
class TrendLog(
    @Column(name = "crawl_run_id", nullable = false)
    var crawlRunId: Long = 0,
    @Column(name = "keyword_id", nullable = false)
    var keywordId: Long = 0,
    @Column
    var rank: Int? = null,
    @Column
    var score: Long? = null,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "recorded_at", nullable = false)
    var recordedAt: LocalDateTime = LocalDateTime.now()
}
