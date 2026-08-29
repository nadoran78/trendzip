package com.mztrend.controller

import com.mztrend.config.CacheNames
import com.mztrend.config.MediaOperationsApiInterceptor
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.jooq.Tables.KEYWORD_RELATIONS
import com.mztrend.jooq.Tables.TREND_CRAWL_RUNS
import com.mztrend.jooq.Tables.TREND_FEED_ITEMS
import com.mztrend.jooq.Tables.TREND_LOGS
import com.mztrend.jooq.Tables.TREND_VIDEOS
import com.mztrend.jooq.Tables.TREND_VIDEO_KEYWORDS
import org.hamcrest.Matchers.nullValue
import org.jooq.DSLContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.cache.CacheManager
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KeywordControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var cacheManager: CacheManager

    @BeforeEach
    fun setUp() {
        cacheManager.getCache(CacheNames.KEYWORDS)?.clear()
        dsl.deleteFrom(KEYWORD_RELATIONS).execute()
        dsl.deleteFrom(TREND_VIDEO_KEYWORDS).execute()
        dsl.deleteFrom(TREND_FEED_ITEMS).execute()
        dsl.deleteFrom(TREND_LOGS).execute()
        dsl.deleteFrom(TREND_CRAWL_RUNS).execute()
        dsl.deleteFrom(TREND_VIDEOS).execute()
        dsl.deleteFrom(KEYWORDS).execute()

        dsl
            .insertInto(
                KEYWORDS,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.CATEGORY,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.TREND_SCORE,
                KEYWORDS.RANK_TREND,
                KEYWORDS.RANK_DELTA,
            ).values(1L, "teen-second", Generation.TEEN.name, "music", 2, 982_000L, RankTrend.DOWN.name, 1)
            .values(2L, "teen-first", Generation.TEEN.name, "game", 1, 1_200_000L, RankTrend.UP.name, 4)
            .values(3L, "twenty-first", Generation.TWENTY.name, "beauty", 1, 744_000L, RankTrend.NEW.name, null)
            .execute()

        insertKeywordListCrawlRuns()
    }

    @Test
    fun `getKeywords returns keywords for generation`() {
        mockMvc
            .perform(get("/api/keywords").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.generation").value(Generation.TEEN.name))
            .andExpect(jsonPath("$.data.keywords.length()").value(2))
            .andExpect(jsonPath("$.data.keywords[0].word").value("teen-first"))
            .andExpect(jsonPath("$.data.keywords[0].rank").value(1))
            .andExpect(jsonPath("$.data.keywords[0].category").value("game"))
            .andExpect(jsonPath("$.data.keywords[0].trendScore").value(1_200_000))
            .andExpect(jsonPath("$.data.keywords[0].rankTrend").value(RankTrend.UP.name))
            .andExpect(jsonPath("$.data.keywords[0].rankDelta").value(4))
            .andExpect(jsonPath("$.data.keywords[1].word").value("teen-second"))
    }

    @Test
    fun `getKeywords returns cached keywords for same generation`() {
        mockMvc
            .perform(get("/api/keywords").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.keywords.length()").value(2))

        dsl.deleteFrom(KEYWORDS).execute()

        mockMvc
            .perform(get("/api/keywords").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.keywords.length()").value(2))
            .andExpect(jsonPath("$.data.keywords[0].word").value("teen-first"))
    }

    @Test
    fun `getKeywords returns bad request for invalid generation`() {
        mockMvc
            .perform(get("/api/keywords").param("generation", "INVALID"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"))
    }

    private fun insertKeywordListCrawlRuns() {
        dsl
            .insertInto(
                TREND_CRAWL_RUNS,
                TREND_CRAWL_RUNS.ID,
                TREND_CRAWL_RUNS.GENERATION,
                TREND_CRAWL_RUNS.STATUS,
                TREND_CRAWL_RUNS.STARTED_AT,
                TREND_CRAWL_RUNS.COMPLETED_AT,
            ).values(
                1L,
                Generation.TEEN.name,
                TrendCrawlRunStatus.COMPLETED.name,
                java.time.LocalDateTime.of(2026, 7, 26, 3, 0),
                java.time.LocalDateTime.of(2026, 7, 26, 3, 5),
            ).values(
                2L,
                Generation.TWENTY.name,
                TrendCrawlRunStatus.COMPLETED.name,
                java.time.LocalDateTime.of(2026, 7, 26, 3, 10),
                java.time.LocalDateTime.of(2026, 7, 26, 3, 15),
            ).execute()

        dsl
            .insertInto(
                TREND_LOGS,
                TREND_LOGS.ID,
                TREND_LOGS.CRAWL_RUN_ID,
                TREND_LOGS.KEYWORD_ID,
                TREND_LOGS.RANK,
                TREND_LOGS.SCORE,
            ).values(1L, 1L, 2L, 1, 1_200_000L)
            .values(2L, 1L, 1L, 2, 982_000L)
            .values(3L, 2L, 3L, 1, 744_000L)
            .execute()
    }

    @Test
    fun `getKeywordExplain returns keyword explanation detail`() {
        insertKeywordExplainFixture()

        mockMvc
            .perform(get("/api/keywords/{id}/explain", 10L))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.keywordId").value(10))
            .andExpect(jsonPath("$.data.keyword").value("동궁"))
            .andExpect(jsonPath("$.data.generation").value(Generation.TEEN.name))
            .andExpect(jsonPath("$.data.category").value("방송/영화"))
            .andExpect(jsonPath("$.data.rank").value(1))
            .andExpect(jsonPath("$.data.trendScore").value(2_600))
            .andExpect(jsonPath("$.data.rankTrend").value(RankTrend.NEW.name))
            .andExpect(jsonPath("$.data.rankDelta").value(nullValue()))
            .andExpect(jsonPath("$.data.explain").value("넷플릭스 신작 공개로 관련 배우와 작품명이 함께 주목받고 있습니다."))
            .andExpect(jsonPath("$.data.sourceCrawlRunId").value(1))
            .andExpect(jsonPath("$.data.snapshotAt").value("2026-06-08T12:00:00"))
            .andExpect(jsonPath("$.data.explainedAt").value("2026-06-08T12:05:00"))
            .andExpect(jsonPath("$.data.relatedVideos.length()").value(2))
            .andExpect(jsonPath("$.data.relatedVideos[0].videoId").value("donggung-trailer"))
            .andExpect(jsonPath("$.data.relatedVideos[0].keywordId").value(10))
            .andExpect(jsonPath("$.data.relatedVideos[0].keyword").value("동궁"))
            .andExpect(jsonPath("$.data.relatedVideos[0].feedSection").value(FeedSection.RISING.name))
            .andExpect(jsonPath("$.data.relatedVideos[0].badge").value("HOT"))
            .andExpect(jsonPath("$.data.relatedVideos[1].videoId").value("donggung-interview"))
            .andExpect(jsonPath("$.data.trendGraph.length()").value(2))
            .andExpect(jsonPath("$.data.trendGraph[0].period").value("2026-06-01"))
            .andExpect(jsonPath("$.data.trendGraph[0].ratio").value(1200))
            .andExpect(jsonPath("$.data.trendGraph[0].rank").value(4))
            .andExpect(jsonPath("$.data.trendGraph[1].period").value("2026-06-08"))
            .andExpect(jsonPath("$.data.trendGraph[1].ratio").value(2600))
            .andExpect(jsonPath("$.data.trendGraph[1].rank").value(1))
            .andExpect(jsonPath("$.data.relatedKeywords.length()").value(1))
            .andExpect(jsonPath("$.data.relatedKeywords[0].word").value("남주혁"))
            .andExpect(jsonPath("$.data.relatedKeywords[0].rankTrend").value(RankTrend.UP.name))
    }

    @Test
    fun `get media keyword detail returns protected evidence metadata`() {
        insertKeywordExplainFixture()

        mockMvc
            .perform(
                get("/api/ops/media/keywords/{id}", 10L)
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_MEDIA_OPERATIONS_API_KEY),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.keywordId").value(10))
            .andExpect(jsonPath("$.data.relatedVideos.length()").value(2))
            .andExpect(jsonPath("$.data.relatedVideos[0].videoId").value("donggung-trailer"))
            .andExpect(jsonPath("$.data.relatedVideos[0].channelId").value("netflix-korea"))
            .andExpect(jsonPath("$.data.relatedVideos[0].description").value("동궁 공개일과 출연진을 소개합니다."))
            .andExpect(jsonPath("$.data.relatedVideos[0].tags[0]").value("동궁"))
            .andExpect(jsonPath("$.data.relatedVideos[0].tags[1]").value("남주혁"))
    }

    @Test
    fun `get media keyword detail requires operations API key`() {
        mockMvc
            .perform(get("/api/ops/media/keywords/{id}", 10L))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
    }

    @Test
    fun `getKeywordExplain returns null explain and empty arrays when optional data is missing`() {
        insertKeywordWithoutExplain()

        mockMvc
            .perform(get("/api/keywords/{id}/explain", 20L))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.keywordId").value(20))
            .andExpect(jsonPath("$.data.keyword").value("설명없음"))
            .andExpect(jsonPath("$.data.generation").value(Generation.TEEN.name))
            .andExpect(jsonPath("$.data.category").value("기타"))
            .andExpect(jsonPath("$.data.rank").value(nullValue()))
            .andExpect(jsonPath("$.data.trendScore").value(nullValue()))
            .andExpect(jsonPath("$.data.rankTrend").value(nullValue()))
            .andExpect(jsonPath("$.data.rankDelta").value(nullValue()))
            .andExpect(jsonPath("$.data.explain").value(nullValue()))
            .andExpect(jsonPath("$.data.sourceCrawlRunId").value(nullValue()))
            .andExpect(jsonPath("$.data.snapshotAt").value(nullValue()))
            .andExpect(jsonPath("$.data.explainedAt").value(nullValue()))
            .andExpect(jsonPath("$.data.relatedVideos.length()").value(0))
            .andExpect(jsonPath("$.data.trendGraph.length()").value(0))
            .andExpect(jsonPath("$.data.relatedKeywords.length()").value(0))
    }

    @Test
    fun `getKeywordExplain returns not found for unknown keyword id`() {
        mockMvc
            .perform(get("/api/keywords/{id}/explain", 999L))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
    }

    private fun insertKeywordExplainFixture() {
        dsl
            .insertInto(
                KEYWORDS,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.CATEGORY,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.TREND_SCORE,
                KEYWORDS.RANK_TREND,
                KEYWORDS.RANK_DELTA,
                KEYWORDS.EXPLAIN,
            ).values(
                10L,
                "동궁",
                Generation.TEEN.name,
                "방송/영화",
                1,
                12_000L,
                RankTrend.NEW.name,
                null,
                "넷플릭스 신작 공개로 관련 배우와 작품명이 함께 주목받고 있습니다.",
            ).values(
                11L,
                "남주혁",
                Generation.TEEN.name,
                "인물",
                2,
                8_000L,
                RankTrend.UP.name,
                3,
                null,
            ).values(
                12L,
                "다른세대",
                Generation.TWENTY.name,
                "인물",
                1,
                9_000L,
                RankTrend.NEW.name,
                null,
                null,
            ).values(
                13L,
                "비활성",
                Generation.TEEN.name,
                "방송/영화",
                3,
                7_000L,
                RankTrend.SAME.name,
                0,
                null,
            ).execute()

        dsl
            .update(KEYWORDS)
            .set(KEYWORDS.EXPLAINED_AT, java.time.LocalDateTime.of(2026, 6, 8, 12, 5))
            .where(KEYWORDS.ID.eq(10L))
            .execute()

        dsl
            .insertInto(
                TREND_CRAWL_RUNS,
                TREND_CRAWL_RUNS.ID,
                TREND_CRAWL_RUNS.GENERATION,
                TREND_CRAWL_RUNS.STATUS,
                TREND_CRAWL_RUNS.STARTED_AT,
                TREND_CRAWL_RUNS.COMPLETED_AT,
            ).values(
                1000L,
                Generation.TEEN.name,
                TrendCrawlRunStatus.COMPLETED.name,
                java.time.LocalDateTime.of(2026, 7, 25, 3, 0),
                java.time.LocalDateTime.of(2026, 7, 25, 3, 5),
            ).execute()

        dsl
            .insertInto(
                TREND_VIDEOS,
                TREND_VIDEOS.ID,
                TREND_VIDEOS.YOUTUBE_VIDEO_ID,
                TREND_VIDEOS.TITLE,
                TREND_VIDEOS.DESCRIPTION,
                TREND_VIDEOS.TAGS,
                TREND_VIDEOS.CHANNEL_ID,
                TREND_VIDEOS.CHANNEL_NAME,
                TREND_VIDEOS.THUMBNAIL_URL,
                TREND_VIDEOS.VIEW_COUNT,
                TREND_VIDEOS.PUBLISHED_AT,
                TREND_VIDEOS.DURATION_SECONDS,
            ).values(
                100L,
                "donggung-interview",
                "동궁 배우 인터뷰",
                "동궁 배우들이 작품의 배경을 설명합니다.",
                arrayOf("동궁", "인터뷰"),
                "netflix-korea",
                "Netflix Korea",
                "https://img.example/donggung-interview.jpg",
                200_000L,
                java.time.LocalDateTime.of(2026, 6, 2, 11, 0),
                180,
            ).values(
                101L,
                "donggung-trailer",
                "동궁 공식 예고편",
                "동궁 공개일과 출연진을 소개합니다.",
                arrayOf("동궁", "남주혁"),
                "netflix-korea",
                "Netflix Korea",
                "https://img.example/donggung-trailer.jpg",
                500_000L,
                java.time.LocalDateTime.of(2026, 6, 1, 10, 0),
                120,
            ).execute()

        dsl
            .insertInto(
                TREND_VIDEO_KEYWORDS,
                TREND_VIDEO_KEYWORDS.ID,
                TREND_VIDEO_KEYWORDS.TREND_VIDEO_ID,
                TREND_VIDEO_KEYWORDS.KEYWORD_ID,
                TREND_VIDEO_KEYWORDS.RELATION_TYPE,
                TREND_VIDEO_KEYWORDS.DISPLAY_ORDER,
                TREND_VIDEO_KEYWORDS.SCORE,
                TREND_VIDEO_KEYWORDS.SOURCE,
            ).values(
                1000L,
                100L,
                10L,
                TrendVideoKeywordRelationType.RELATED.name,
                2,
                80,
                "test",
            ).values(
                1001L,
                101L,
                10L,
                TrendVideoKeywordRelationType.RELATED.name,
                1,
                90,
                "test",
            ).execute()

        dsl
            .insertInto(
                TREND_FEED_ITEMS,
                TREND_FEED_ITEMS.ID,
                TREND_FEED_ITEMS.GENERATION,
                TREND_FEED_ITEMS.TREND_VIDEO_ID,
                TREND_FEED_ITEMS.PRIMARY_KEYWORD_ID,
                TREND_FEED_ITEMS.FEED_SECTION,
                TREND_FEED_ITEMS.DISPLAY_ORDER,
                TREND_FEED_ITEMS.SCORE,
                TREND_FEED_ITEMS.BADGE,
                TREND_FEED_ITEMS.SOURCE,
                TREND_FEED_ITEMS.IS_ACTIVE,
            ).values(
                1000L,
                Generation.TEEN.name,
                101L,
                10L,
                FeedSection.RISING.name,
                1,
                90,
                "HOT",
                "test",
                true,
            ).execute()

        dsl
            .insertInto(
                TREND_LOGS,
                TREND_LOGS.ID,
                TREND_LOGS.CRAWL_RUN_ID,
                TREND_LOGS.KEYWORD_ID,
                TREND_LOGS.RANK,
                TREND_LOGS.SCORE,
                TREND_LOGS.RECORDED_AT,
            ).values(
                1001L,
                1000L,
                10L,
                4,
                1_200L,
                java.time.LocalDateTime.of(2026, 6, 1, 9, 0),
            ).values(
                1002L,
                1L,
                10L,
                1,
                2_600L,
                java.time.LocalDateTime.of(2026, 6, 8, 12, 0),
            ).execute()

        dsl
            .insertInto(
                KEYWORD_RELATIONS,
                KEYWORD_RELATIONS.ID,
                KEYWORD_RELATIONS.KEYWORD_ID,
                KEYWORD_RELATIONS.RELATED_KEYWORD_ID,
                KEYWORD_RELATIONS.DISPLAY_ORDER,
                KEYWORD_RELATIONS.SCORE,
                KEYWORD_RELATIONS.SOURCE,
                KEYWORD_RELATIONS.IS_ACTIVE,
                KEYWORD_RELATIONS.DEACTIVATED_AT,
            ).values(
                1000L,
                10L,
                11L,
                1,
                95,
                "test",
                true,
                null,
            ).values(
                1001L,
                10L,
                12L,
                0,
                100,
                "test",
                true,
                null,
            ).values(
                1002L,
                10L,
                13L,
                0,
                100,
                "test",
                false,
                java.time.LocalDateTime.of(2026, 6, 9, 9, 0),
            ).execute()
    }

    private fun insertKeywordWithoutExplain() {
        dsl
            .insertInto(
                KEYWORDS,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.CATEGORY,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.TREND_SCORE,
            ).values(
                20L,
                "설명없음",
                Generation.TEEN.name,
                "기타",
                20,
                500L,
            ).execute()
    }

    private companion object {
        const val TEST_MEDIA_OPERATIONS_API_KEY = "test-media-operations-key"
    }
}
