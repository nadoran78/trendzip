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
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime

@Entity
@Table(name = "external_api_logs")
class ExternalApiLog(
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var direction: ExternalApiDirection = ExternalApiDirection.OUTBOUND,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var provider: ExternalApiProvider = ExternalApiProvider.UNKNOWN,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var purpose: ExternalApiPurpose = ExternalApiPurpose.UNKNOWN,
    @Column(nullable = false, length = 10)
    var method: String = "",
    @Column(nullable = false, length = 500)
    var endpoint: String = "",
    @Column(name = "http_status")
    var httpStatus: Int? = null,
    @Column(nullable = false)
    var success: Boolean = false,
    @Column(name = "duration_ms", nullable = false)
    var durationMs: Long = 0,
    @Column(name = "request_body", columnDefinition = "TEXT")
    var requestBody: String? = null,
    @Column(name = "response_body", columnDefinition = "TEXT")
    var responseBody: String? = null,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_metadata", columnDefinition = "jsonb")
    var requestMetadata: Map<String, Any?>? = null,
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_metadata", columnDefinition = "jsonb")
    var responseMetadata: Map<String, Any?>? = null,
    @Column(name = "error_message", columnDefinition = "TEXT")
    var errorMessage: String? = null,
    @Column(name = "started_at", nullable = false)
    var startedAt: LocalDateTime = LocalDateTime.now(),
    @Column(name = "ended_at", nullable = false)
    var endedAt: LocalDateTime = LocalDateTime.now(),
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
