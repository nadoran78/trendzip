package com.mztrend.repository.query

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.jooq.Tables.TREND_FEED_ITEMS
import com.mztrend.jooq.Tables.TREND_VIDEOS
import com.mztrend.repository.query.dto.FeedVideoQueryResult
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.impl.DSL
import org.springframework.stereotype.Repository

@Repository
class FeedQueryRepository(
    private val dsl: DSLContext,
) {
    fun findByGeneration(generation: Generation): List<FeedVideoQueryResult> {
        val feedSectionOrder = feedSectionOrderField(TREND_FEED_ITEMS.FEED_SECTION)

        return dsl
            .select(
                TREND_VIDEOS.YOUTUBE_VIDEO_ID,
                TREND_VIDEOS.TITLE,
                TREND_VIDEOS.CHANNEL_NAME,
                TREND_VIDEOS.THUMBNAIL_URL,
                TREND_VIDEOS.VIEW_COUNT,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                TREND_FEED_ITEMS.FEED_SECTION,
                TREND_FEED_ITEMS.BADGE,
                TREND_VIDEOS.PUBLISHED_AT,
                TREND_VIDEOS.DURATION_SECONDS,
            ).from(TREND_FEED_ITEMS)
            .join(TREND_VIDEOS)
            .on(TREND_VIDEOS.ID.eq(TREND_FEED_ITEMS.TREND_VIDEO_ID))
            .join(KEYWORDS)
            .on(KEYWORDS.ID.eq(TREND_FEED_ITEMS.PRIMARY_KEYWORD_ID))
            .where(TREND_FEED_ITEMS.GENERATION.eq(generation.name))
            .and(KEYWORDS.GENERATION.eq(generation.name))
            .and(TREND_FEED_ITEMS.IS_ACTIVE.isTrue)
            .orderBy(
                feedSectionOrder.asc(),
                TREND_FEED_ITEMS.DISPLAY_ORDER.asc(),
                TREND_FEED_ITEMS.SCORE.desc().nullsLast(),
                TREND_VIDEOS.VIEW_COUNT.desc().nullsLast(),
                TREND_FEED_ITEMS.ID.desc(),
            ).fetch { record ->
                FeedVideoQueryResult(
                    videoId = record.get(TREND_VIDEOS.YOUTUBE_VIDEO_ID),
                    keywordId = record.get(KEYWORDS.ID),
                    title = record.get(TREND_VIDEOS.TITLE),
                    channelName = record.get(TREND_VIDEOS.CHANNEL_NAME),
                    thumbnailUrl = record.get(TREND_VIDEOS.THUMBNAIL_URL),
                    viewCount = record.get(TREND_VIDEOS.VIEW_COUNT),
                    keyword = record.get(KEYWORDS.WORD),
                    feedSection = record.get(TREND_FEED_ITEMS.FEED_SECTION)?.let(FeedSection::valueOf),
                    badge = record.get(TREND_FEED_ITEMS.BADGE),
                    publishedAt = record.get(TREND_VIDEOS.PUBLISHED_AT),
                    durationSeconds = record.get(TREND_VIDEOS.DURATION_SECONDS),
                )
            }
    }

    private fun feedSectionOrderField(feedSection: Field<String?>): Field<Int> =
        DSL
            .case_(feedSection)
            .`when`(FeedSection.TODAY_PICK.name, 1)
            .`when`(FeedSection.RISING.name, 2)
            .`when`(FeedSection.RELATED.name, 3)
            .otherwise(99)
}
