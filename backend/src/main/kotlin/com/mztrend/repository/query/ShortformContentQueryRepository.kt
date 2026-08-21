package com.mztrend.repository.query

import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration
import com.mztrend.jooq.Tables.SHORTFORM_CONTENTS
import com.mztrend.jooq.Tables.SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS
import com.mztrend.repository.query.dto.ShortformContentKeywordSnapshotQueryResult
import com.mztrend.repository.query.dto.ShortformContentQueryResult
import org.jooq.DSLContext
import org.jooq.Record
import org.springframework.stereotype.Repository
import java.time.LocalDateTime

@Repository
class ShortformContentQueryRepository(
    private val dsl: DSLContext,
) {
    fun findRecent(from: LocalDateTime): List<ShortformContentQueryResult> {
        val records =
            dsl
                .selectFrom(SHORTFORM_CONTENTS)
                .where(
                    SHORTFORM_CONTENTS.SELECTED_AT
                        .ge(from)
                        .or(SHORTFORM_CONTENTS.PUBLISHED_AT.ge(from))
                        .or(SHORTFORM_CONTENTS.STATUS.`in`(inProgressStatuses.map { it.name })),
                ).orderBy(SHORTFORM_CONTENTS.SELECTED_AT.desc(), SHORTFORM_CONTENTS.ID.desc())
                .fetch()

        return attachKeywords(records.map { it.toShortformContentQueryResult() })
    }

    fun findById(id: Long): ShortformContentQueryResult? {
        val content =
            dsl
                .selectFrom(SHORTFORM_CONTENTS)
                .where(SHORTFORM_CONTENTS.ID.eq(id))
                .fetchOne()
                ?.toShortformContentQueryResult()
                ?: return null

        return attachKeywords(listOf(content)).single()
    }

    private fun attachKeywords(contents: List<ShortformContentQueryResult>): List<ShortformContentQueryResult> {
        if (contents.isEmpty()) return emptyList()

        val keywordsByContentId =
            dsl
                .selectFrom(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS)
                .where(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.SHORTFORM_CONTENT_ID.`in`(contents.map { it.id }))
                .orderBy(
                    SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.SHORTFORM_CONTENT_ID.asc(),
                    SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.DISPLAY_ORDER.asc(),
                    SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.ID.asc(),
                ).fetch()
                .groupBy { it.get(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.SHORTFORM_CONTENT_ID) }

        return contents.map { content ->
            content.copy(
                keywords =
                    keywordsByContentId[content.id].orEmpty().map { record ->
                        ShortformContentKeywordSnapshotQueryResult(
                            keywordId = record.get(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.KEYWORD_ID),
                            keywordWord = record.get(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.KEYWORD_WORD),
                            role = ShortformKeywordRole.valueOf(record.get(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.ROLE)),
                            displayOrder = record.get(SHORTFORM_CONTENT_KEYWORD_SNAPSHOTS.DISPLAY_ORDER),
                        )
                    },
            )
        }
    }

    private fun Record.toShortformContentQueryResult(): ShortformContentQueryResult =
        ShortformContentQueryResult(
            id = get(SHORTFORM_CONTENTS.ID),
            platform = ShortformPlatform.valueOf(get(SHORTFORM_CONTENTS.PLATFORM)),
            externalContentId = get(SHORTFORM_CONTENTS.EXTERNAL_CONTENT_ID),
            status = ShortformContentStatus.valueOf(get(SHORTFORM_CONTENTS.STATUS)),
            primaryKeywordId = get(SHORTFORM_CONTENTS.PRIMARY_KEYWORD_ID),
            primaryKeywordWord = get(SHORTFORM_CONTENTS.PRIMARY_KEYWORD_WORD),
            sourceGeneration = ShortformSourceGeneration.valueOf(get(SHORTFORM_CONTENTS.SOURCE_GENERATION)),
            editorialFormat = ShortformEditorialFormat.valueOf(get(SHORTFORM_CONTENTS.EDITORIAL_FORMAT)),
            topicKey = get(SHORTFORM_CONTENTS.TOPIC_KEY),
            eventKey = get(SHORTFORM_CONTENTS.EVENT_KEY),
            audienceAngle = get(SHORTFORM_CONTENTS.AUDIENCE_ANGLE),
            selectionReason = get(SHORTFORM_CONTENTS.SELECTION_REASON),
            title = get(SHORTFORM_CONTENTS.TITLE),
            contentHash = get(SHORTFORM_CONTENTS.CONTENT_HASH),
            sourceCrawlRunId = get(SHORTFORM_CONTENTS.SOURCE_CRAWL_RUN_ID),
            selectedAt = get(SHORTFORM_CONTENTS.SELECTED_AT),
            renderedAt = get(SHORTFORM_CONTENTS.RENDERED_AT),
            uploadedAt = get(SHORTFORM_CONTENTS.UPLOADED_AT),
            publishedAt = get(SHORTFORM_CONTENTS.PUBLISHED_AT),
            createdAt = get(SHORTFORM_CONTENTS.CREATED_AT),
            updatedAt = get(SHORTFORM_CONTENTS.UPDATED_AT),
            keywords = emptyList(),
        )

    private companion object {
        val inProgressStatuses =
            setOf(
                ShortformContentStatus.DRAFT,
                ShortformContentStatus.RENDERED,
                ShortformContentStatus.REVIEW_REQUIRED,
                ShortformContentStatus.APPROVED,
                ShortformContentStatus.UPLOADED_PRIVATE,
                ShortformContentStatus.SCHEDULED,
                ShortformContentStatus.HOLD,
                ShortformContentStatus.NEEDS_REVISION,
            )
    }
}
