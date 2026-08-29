package com.mztrend.controller.ops.dto

import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration
import com.mztrend.repository.query.dto.ShortformContentKeywordSnapshotQueryResult
import com.mztrend.repository.query.dto.ShortformContentQueryResult
import com.mztrend.service.ReserveShortformDraftCommand
import com.mztrend.service.ShortformKeywordCommand
import com.mztrend.service.UpdateShortformContentStatusCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class ReserveShortformDraftRequest(
    val platform: ShortformPlatform,
    @field:Positive
    val primaryKeywordId: Long,
    @field:NotBlank
    @field:Size(max = 100)
    val primaryKeywordWord: String,
    val sourceGeneration: ShortformSourceGeneration,
    val editorialFormat: ShortformEditorialFormat,
    @field:NotBlank
    @field:Size(max = 200)
    val topicKey: String,
    @field:NotBlank
    @field:Size(max = 200)
    val eventKey: String,
    @field:NotBlank
    @field:Size(max = 500)
    val audienceAngle: String,
    @field:NotBlank
    val selectionReason: String,
    @field:NotBlank
    @field:Size(max = 100)
    val title: String,
    @field:Pattern(regexp = "^[0-9a-f]{64}$")
    val contentHash: String,
    @field:Positive
    val sourceCrawlRunId: Long,
    @field:Valid
    @field:Size(max = 10)
    val relatedKeywords: List<ShortformKeywordRequest> = emptyList(),
)

data class ShortformKeywordRequest(
    @field:Positive
    val keywordId: Long,
    @field:NotBlank
    @field:Size(max = 100)
    val keywordWord: String,
)

data class UpdateShortformContentStatusRequest(
    val status: ShortformContentStatus,
    @field:Size(max = 100)
    val externalContentId: String? = null,
)

data class ShortformContentListResponse(
    val contents: List<ShortformContentResponse>,
)

data class ShortformContentResponse(
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
    val keywords: List<ShortformContentKeywordResponse>,
)

data class ShortformContentKeywordResponse(
    val keywordId: Long,
    val keywordWord: String,
    val role: ShortformKeywordRole,
    val displayOrder: Int,
)

fun ReserveShortformDraftRequest.toCommand(): ReserveShortformDraftCommand =
    ReserveShortformDraftCommand(
        platform = platform,
        primaryKeywordId = primaryKeywordId,
        primaryKeywordWord = primaryKeywordWord,
        sourceGeneration = sourceGeneration,
        editorialFormat = editorialFormat,
        topicKey = topicKey,
        eventKey = eventKey,
        audienceAngle = audienceAngle,
        selectionReason = selectionReason,
        title = title,
        contentHash = contentHash,
        sourceCrawlRunId = sourceCrawlRunId,
        relatedKeywords = relatedKeywords.map { ShortformKeywordCommand(it.keywordId, it.keywordWord) },
    )

fun UpdateShortformContentStatusRequest.toCommand(): UpdateShortformContentStatusCommand =
    UpdateShortformContentStatusCommand(
        status = status,
        externalContentId = externalContentId,
    )

fun ShortformContentQueryResult.toResponse(): ShortformContentResponse =
    ShortformContentResponse(
        id = id,
        platform = platform,
        externalContentId = externalContentId,
        status = status,
        primaryKeywordId = primaryKeywordId,
        primaryKeywordWord = primaryKeywordWord,
        sourceGeneration = sourceGeneration,
        editorialFormat = editorialFormat,
        topicKey = topicKey,
        eventKey = eventKey,
        audienceAngle = audienceAngle,
        selectionReason = selectionReason,
        title = title,
        contentHash = contentHash,
        sourceCrawlRunId = sourceCrawlRunId,
        selectedAt = selectedAt,
        renderedAt = renderedAt,
        uploadedAt = uploadedAt,
        publishedAt = publishedAt,
        createdAt = createdAt,
        updatedAt = updatedAt,
        keywords = keywords.map { it.toResponse() },
    )

private fun ShortformContentKeywordSnapshotQueryResult.toResponse(): ShortformContentKeywordResponse =
    ShortformContentKeywordResponse(
        keywordId = keywordId,
        keywordWord = keywordWord,
        role = role,
        displayOrder = displayOrder,
    )
