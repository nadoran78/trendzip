package com.mztrend.controller

import com.mztrend.config.CacheNames
import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.jooq.Tables.KEYWORDS
import com.mztrend.jooq.Tables.TREND_FEED_ITEMS
import com.mztrend.jooq.Tables.TREND_VIDEOS
import com.mztrend.jooq.Tables.TREND_VIDEO_KEYWORDS
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
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var dsl: DSLContext

    @Autowired
    private lateinit var cacheManager: CacheManager

    @BeforeEach
    fun setUp() {
        cacheManager.getCache(CacheNames.FEED)?.clear()
        dsl.deleteFrom(TREND_VIDEO_KEYWORDS).execute()
        dsl.deleteFrom(TREND_FEED_ITEMS).execute()
        dsl.deleteFrom(TREND_VIDEOS).execute()
        dsl.deleteFrom(KEYWORDS).execute()

        insertKeywords()
        insertTrendVideos()
        insertTrendFeedItems()
    }

    @Test
    fun `getFeed returns active feed videos for generation ordered by section and display order`() {
        mockMvc
            .perform(get("/api/feed").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.generation").value(Generation.TEEN.name))
            .andExpect(jsonPath("$.data.videos.length()").value(4))
            .andExpect(jsonPath("$.data.videos[0].videoId").value("teen-today-1"))
            .andExpect(jsonPath("$.data.videos[0].keyword").value("teen-first"))
            .andExpect(jsonPath("$.data.videos[0].feedSection").value(FeedSection.TODAY_PICK.name))
            .andExpect(jsonPath("$.data.videos[0].viewCount").value(900_000))
            .andExpect(jsonPath("$.data.videos[0].badge").value("HOT"))
            .andExpect(jsonPath("$.data.videos[0].durationSeconds").value(180))
            .andExpect(jsonPath("$.data.videos[1].videoId").value("teen-today-2"))
            .andExpect(jsonPath("$.data.videos[1].keyword").value("teen-second"))
            .andExpect(jsonPath("$.data.videos[2].videoId").value("teen-rising-1"))
            .andExpect(jsonPath("$.data.videos[2].feedSection").value(FeedSection.RISING.name))
            .andExpect(jsonPath("$.data.videos[3].videoId").value("teen-related-1"))
            .andExpect(jsonPath("$.data.videos[3].feedSection").value(FeedSection.RELATED.name))
    }

    @Test
    fun `getFeed filters videos by generation`() {
        mockMvc
            .perform(get("/api/feed").param("generation", Generation.TWENTY.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.generation").value(Generation.TWENTY.name))
            .andExpect(jsonPath("$.data.videos.length()").value(1))
            .andExpect(jsonPath("$.data.videos[0].videoId").value("twenty-today-1"))
            .andExpect(jsonPath("$.data.videos[0].keyword").value("twenty-first"))
    }

    @Test
    fun `getFeed returns cached feed for same generation`() {
        mockMvc
            .perform(get("/api/feed").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.videos.length()").value(4))

        dsl.deleteFrom(TREND_FEED_ITEMS).execute()
        dsl.deleteFrom(TREND_VIDEOS).execute()

        mockMvc
            .perform(get("/api/feed").param("generation", Generation.TEEN.name))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data.videos.length()").value(4))
            .andExpect(jsonPath("$.data.videos[0].videoId").value("teen-today-1"))
    }

    @Test
    fun `getFeed returns bad request for invalid generation`() {
        mockMvc
            .perform(get("/api/feed").param("generation", "INVALID"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"))
    }

    private fun insertKeywords() {
        dsl
            .insertInto(
                KEYWORDS,
                KEYWORDS.ID,
                KEYWORDS.WORD,
                KEYWORDS.GENERATION,
                KEYWORDS.CATEGORY,
                KEYWORDS.CURRENT_RANK,
                KEYWORDS.TREND_SCORE,
            ).values(1L, "teen-first", Generation.TEEN.name, "music", 1, 1_200_000L)
            .values(2L, "teen-second", Generation.TEEN.name, "game", 2, 950_000L)
            .values(3L, "teen-inactive", Generation.TEEN.name, "tag", 3, 700_000L)
            .values(4L, "twenty-first", Generation.TWENTY.name, "life", 1, 820_000L)
            .values(5L, "twenty-wrong-feed", Generation.TWENTY.name, "wrong", 2, 100_000L)
            .execute()
    }

    private fun insertTrendVideos() {
        dsl
            .insertInto(
                TREND_VIDEOS,
                TREND_VIDEOS.ID,
                TREND_VIDEOS.YOUTUBE_VIDEO_ID,
                TREND_VIDEOS.TITLE,
                TREND_VIDEOS.CHANNEL_NAME,
                TREND_VIDEOS.THUMBNAIL_URL,
                TREND_VIDEOS.VIEW_COUNT,
                TREND_VIDEOS.PUBLISHED_AT,
                TREND_VIDEOS.DURATION_SECONDS,
            ).values(
                1L,
                "teen-today-2",
                "teen today second",
                "teen channel",
                "https://img.example/teen-today-2.jpg",
                1_100_000L,
                LocalDateTime.of(2026, 5, 20, 18, 0),
                210,
            ).values(
                2L,
                "teen-today-1",
                "teen today first",
                "teen channel",
                "https://img.example/teen-today-1.jpg",
                900_000L,
                LocalDateTime.of(2026, 5, 20, 19, 0),
                180,
            ).values(
                3L,
                "teen-rising-1",
                "teen rising",
                "teen channel",
                "https://img.example/teen-rising-1.jpg",
                1_500_000L,
                LocalDateTime.of(2026, 5, 19, 20, 0),
                240,
            ).values(
                4L,
                "teen-related-1",
                "teen related",
                "teen channel",
                "https://img.example/teen-related-1.jpg",
                2_000_000L,
                LocalDateTime.of(2026, 5, 18, 21, 0),
                300,
            ).values(
                5L,
                "teen-wrong-keyword-generation",
                "teen wrong keyword generation",
                "teen channel",
                "https://img.example/teen-wrong-keyword-generation.jpg",
                750_000L,
                LocalDateTime.of(2026, 5, 20, 17, 0),
                120,
            ).values(
                6L,
                "twenty-today-1",
                "twenty today",
                "twenty channel",
                "https://img.example/twenty-today-1.jpg",
                800_000L,
                LocalDateTime.of(2026, 5, 20, 20, 0),
                360,
            ).values(
                7L,
                "teen-inactive",
                "teen inactive",
                "teen channel",
                "https://img.example/teen-inactive.jpg",
                3_000_000L,
                LocalDateTime.of(2026, 5, 20, 22, 0),
                400,
            ).execute()
    }

    private fun insertTrendFeedItems() {
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
                1L,
                Generation.TEEN.name,
                1L,
                2L,
                FeedSection.TODAY_PICK.name,
                2,
                80,
                null,
                "test",
                true,
            ).values(
                2L,
                Generation.TEEN.name,
                2L,
                1L,
                FeedSection.TODAY_PICK.name,
                1,
                95,
                "HOT",
                "test",
                true,
            ).values(
                3L,
                Generation.TEEN.name,
                3L,
                1L,
                FeedSection.RISING.name,
                1,
                90,
                "RISING",
                "test",
                true,
            ).values(
                4L,
                Generation.TEEN.name,
                4L,
                1L,
                FeedSection.RELATED.name,
                1,
                70,
                null,
                "test",
                true,
            ).values(
                5L,
                Generation.TWENTY.name,
                6L,
                4L,
                FeedSection.TODAY_PICK.name,
                1,
                88,
                "HOT",
                "test",
                true,
            ).values(
                6L,
                Generation.TEEN.name,
                7L,
                3L,
                FeedSection.TODAY_PICK.name,
                1,
                99,
                null,
                "test",
                false,
            ).values(
                7L,
                Generation.TEEN.name,
                5L,
                5L,
                FeedSection.TODAY_PICK.name,
                3,
                100,
                null,
                "test",
                true,
            ).execute()
    }
}
