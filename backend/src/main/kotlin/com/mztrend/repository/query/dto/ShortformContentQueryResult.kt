package com.mztrend.repository.query.dto

import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration
import java.time.LocalDateTime

data class ShortformContentQueryResult(
    val id: Long,
    val platform: ShortformPlatform,
    val externalContentId: String?,
    val status: ShortformContentStatus,
    val primaryKeywordId: Long,
    val primaryKeywordWord: String,
    val sourceGeneration: ShortformSourceGeneration,
    val editorialFormat: ShortformEditorialFormat,
    val topicKey: String,
    val eventKey: String,
    val audienceAngle: String,
    val selectionReason: String,
    val title: String,
    val contentHash: String,
    val sourceCrawlRunId: Long,
    val selectedAt: LocalDateTime,
    val renderedAt: LocalDateTime?,
    val uploadedAt: LocalDateTime?,
    val publishedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val keywords: List<ShortformContentKeywordSnapshotQueryResult>,
)

data class ShortformContentKeywordSnapshotQueryResult(
    val keywordId: Long,
    val keywordWord: String,
    val role: ShortformKeywordRole,
    val displayOrder: Int,
)
