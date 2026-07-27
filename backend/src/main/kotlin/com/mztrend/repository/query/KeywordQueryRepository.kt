package com.mztrend.repository.query

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.jooq.Tables.KEYWORD_RELATIONS
import com.mztrend.jooq.Tables.TREND_CRAWL_RUNS
import com.mztrend.jooq.Tables.TREND_FEED_ITEMS
import com.mztrend.jooq.Tables.TREND_LOGS
import com.mztrend.jooq.Tables.TREND_VIDEOS
import com.mztrend.jooq.Tables.TREND_VIDEO_KEYWORDS
import com.mztrend.repository.query.dto.FeedVideoQueryResult
import com.mztrend.repository.query.dto.KeywordExplainQueryResult
import com.mztrend.repository.query.dto.KeywordSummaryQueryResult
import com.mztrend.repository.query.dto.TrendGraphPointQueryResult
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class KeywordQueryRepository(
    private val dsl: DSLContext,
) {
    fun findByGeneration(generation: Generation): List<KeywordSummaryQueryResult> {
        val latestCompletedCrawlRunId =
            dsl
                .select(TREND_CRAWL_RUNS.ID)
                .from(TREND_CRAWL_RUNS)
                .where(TREND_CRAWL_RUNS.GENERATION.eq(generation.name))
                .and(TREND_CRAWL_RUNS.STATUS.eq(TrendCrawlRunStatus.COMPLETED.name))
                .orderBy(TREND_CRAWL_RUNS.STARTED_AT.desc(), TREND_CRAWL_RUNS.ID.desc())
                .limit(1)

        return dsl
            .select(
                KEYWORDS.ID,
                KEYWORDS.WORD,
                TREND_LOGS.RANK,
                KEYWORDS.CATEGORY,
                TREND_LOGS.SCORE,
                KEYWORDS.RANK_TREND,
                KEYWORDS.RANK_DELTA,
            ).from(TREND_LOGS)
            .join(KEYWORDS)
            .on(KEYWORDS.ID.eq(TREND_LOGS.KEYWORD_ID))
            .where(TREND_LOGS.CRAWL_RUN_ID.eq(latestCompletedCrawlRunId))
            .and(KEYWORDS.GENERATION.eq(generation.name))
            .orderBy(TREND_LOGS.RANK.asc().nullsLast(), TREND_LOGS.ID.asc())
            .fetch { record ->
                KeywordSummaryQueryResult(
                    id = record.get(KEYWORDS.ID),
                    word = record.get(KEYWORDS.WORD),
                    rank = record.get(TREND_LOGS.RANK),
                    category = record.get(KEYWORDS.CATEGORY),
                    trendScore = record.get(TREND_LOGS.SCORE),
                    rankTrend = record.get(KEYWORDS.RANK_TREND)?.let(RankTrend::valueOf),
                    rankDelta = record.get(KEYWORDS.RANK_DELTA),
                )
            }
    }

    fun findExplainById(id: Long): KeywordExplainQueryResult? =
        dsl
            .select(
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.EXPLAIN,
            ).from(KEYWORDS)
            .where(KEYWORDS.ID.eq(id))
            .fetchOne { record ->
                KeywordExplainQueryResult(
                    id = record.get(KEYWORDS.ID),
                    word = record.get(KEYWORDS.WORD),
                    generation = Generation.valueOf(record.get(KEYWORDS.GENERATION)),
                    explain = record.get(KEYWORDS.EXPLAIN),
                )
            }

    fun findRelatedVideos(
        keywordId: Long,
        keywordWord: String,
    ): List<FeedVideoQueryResult> =
        dsl
            .select(
                TREND_VIDEOS.YOUTUBE_VIDEO_ID,
                TREND_VIDEOS.TITLE,
                TREND_VIDEOS.CHANNEL_NAME,
                TREND_VIDEOS.THUMBNAIL_URL,
                TREND_VIDEOS.VIEW_COUNT,
                TREND_FEED_ITEMS.FEED_SECTION,
                TREND_FEED_ITEMS.BADGE,
                TREND_VIDEOS.PUBLISHED_AT,
                TREND_VIDEOS.DURATION_SECONDS,
            ).from(TREND_VIDEO_KEYWORDS)
            .join(TREND_VIDEOS)
            .on(TREND_VIDEOS.ID.eq(TREND_VIDEO_KEYWORDS.TREND_VIDEO_ID))
            .leftJoin(TREND_FEED_ITEMS)
            .on(
                TREND_FEED_ITEMS.TREND_VIDEO_ID
                    .eq(TREND_VIDEOS.ID)
                    .and(TREND_FEED_ITEMS.PRIMARY_KEYWORD_ID.eq(keywordId))
                    .and(TREND_FEED_ITEMS.IS_ACTIVE.isTrue),
            ).where(TREND_VIDEO_KEYWORDS.KEYWORD_ID.eq(keywordId))
            .orderBy(
                TREND_VIDEO_KEYWORDS.DISPLAY_ORDER.asc(),
                TREND_VIDEO_KEYWORDS.SCORE.desc().nullsLast(),
                TREND_VIDEOS.VIEW_COUNT.desc().nullsLast(),
                TREND_VIDEO_KEYWORDS.ID.asc(),
            ).limit(RELATED_VIDEO_LIMIT)
            .fetch { record ->
                FeedVideoQueryResult(
                    videoId = record.get(TREND_VIDEOS.YOUTUBE_VIDEO_ID),
                    keywordId = keywordId,
                    title = record.get(TREND_VIDEOS.TITLE),
                    channelName = record.get(TREND_VIDEOS.CHANNEL_NAME),
                    thumbnailUrl = record.get(TREND_VIDEOS.THUMBNAIL_URL),
                    viewCount = record.get(TREND_VIDEOS.VIEW_COUNT),
                    keyword = keywordWord,
                    feedSection = record.get(TREND_FEED_ITEMS.FEED_SECTION)?.let(FeedSection::valueOf),
                    badge = record.get(TREND_FEED_ITEMS.BADGE),
                    publishedAt = record.get(TREND_VIDEOS.PUBLISHED_AT),
                    durationSeconds = record.get(TREND_VIDEOS.DURATION_SECONDS),
                )
            }

    fun findTrendGraph(keywordId: Long): List<TrendGraphPointQueryResult> =
        dsl
            .select(
                TREND_LOGS.RECORDED_AT,
                TREND_LOGS.SCORE,
            ).from(TREND_LOGS)
            .where(TREND_LOGS.KEYWORD_ID.eq(keywordId))
            .orderBy(TREND_LOGS.RECORDED_AT.desc(), TREND_LOGS.ID.desc())
            .fetch { record ->
                TrendGraphPointQueryResult(
                    period = record.get(TREND_LOGS.RECORDED_AT).toLocalDate(),
                    ratio = record.get(TREND_LOGS.SCORE),
                )
            }.distinctBy { it.period }
            .take(TREND_GRAPH_LIMIT)
            .sortedBy { it.period }

    fun findRelatedKeywords(
        keywordId: Long,
        generation: Generation,
    ): List<KeywordSummaryQueryResult> {
        val relatedKeywords = KEYWORDS.`as`("related_keywords")

        return dsl
            .select(
                relatedKeywords.ID,
                relatedKeywords.WORD,
                relatedKeywords.CURRENT_RANK,
                relatedKeywords.CATEGORY,
                relatedKeywords.TREND_SCORE,
                relatedKeywords.RANK_TREND,
                relatedKeywords.RANK_DELTA,
            ).from(KEYWORD_RELATIONS)
            .join(relatedKeywords)
            .on(relatedKeywords.ID.eq(KEYWORD_RELATIONS.RELATED_KEYWORD_ID))
            .where(KEYWORD_RELATIONS.KEYWORD_ID.eq(keywordId))
            .and(KEYWORD_RELATIONS.IS_ACTIVE.isTrue)
            .and(relatedKeywords.GENERATION.eq(generation.name))
            .orderBy(
                KEYWORD_RELATIONS.DISPLAY_ORDER.asc(),
                KEYWORD_RELATIONS.SCORE.desc().nullsLast(),
                KEYWORD_RELATIONS.ID.asc(),
            ).limit(RELATED_KEYWORD_LIMIT)
            .fetch { record ->
                KeywordSummaryQueryResult(
                    id = record.get(relatedKeywords.ID),
                    word = record.get(relatedKeywords.WORD),
                    rank = record.get(relatedKeywords.CURRENT_RANK),
                    category = record.get(relatedKeywords.CATEGORY),
                    trendScore = record.get(relatedKeywords.TREND_SCORE),
                    rankTrend = record.get(relatedKeywords.RANK_TREND)?.let(RankTrend::valueOf),
                    rankDelta = record.get(relatedKeywords.RANK_DELTA),
                )
            }
    }

    private companion object {
        private const val RELATED_VIDEO_LIMIT = 3
        private const val RELATED_KEYWORD_LIMIT = 10
        private const val TREND_GRAPH_LIMIT = 28
    }
}
