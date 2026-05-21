package com.mztrend.controller

import com.mztrend.config.CacheNames
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.jooq.Tables.KEYWORDS
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
}
