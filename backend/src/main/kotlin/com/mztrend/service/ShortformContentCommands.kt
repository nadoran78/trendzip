package com.mztrend.service

import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration

data class ReserveShortformDraftCommand(
    val platform: ShortformPlatform,
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
    val relatedKeywords: List<ShortformKeywordCommand>,
)

data class ShortformKeywordCommand(
    val keywordId: Long,
    val keywordWord: String,
)

data class UpdateShortformContentStatusCommand(
    val status: ShortformContentStatus,
    val externalContentId: String?,
)
