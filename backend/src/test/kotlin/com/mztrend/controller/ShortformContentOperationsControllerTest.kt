package com.mztrend.controller

import com.mztrend.config.MediaOperationsApiInterceptor
import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentKeywordSnapshot
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration
import com.mztrend.repository.command.ShortformContentKeywordSnapshotRepository
import com.mztrend.repository.command.ShortformContentRepository
import com.mztrend.repository.command.ShortformRenderArtifactRepository
import com.mztrend.repository.command.ShortformReviewDecisionRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ShortformContentOperationsControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var shortformContentRepository: ShortformContentRepository

    @Autowired
    private lateinit var shortformContentKeywordSnapshotRepository: ShortformContentKeywordSnapshotRepository

    @Autowired
    private lateinit var shortformRenderArtifactRepository: ShortformRenderArtifactRepository

    @Autowired
    private lateinit var shortformReviewDecisionRepository: ShortformReviewDecisionRepository

    @BeforeEach
    fun setUp() {
        shortformReviewDecisionRepository.deleteAllInBatch()
        shortformRenderArtifactRepository.deleteAllInBatch()
        shortformContentKeywordSnapshotRepository.deleteAllInBatch()
        shortformContentRepository.deleteAllInBatch()
    }

    @Test
    fun `operations API rejects request without API key`() {
        mockMvc
            .perform(get("/api/ops/media/contents").param("from", "2026-08-01T00:00:00"))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
    }

    @Test
    fun `getRecentContents returns content and keyword snapshots`() {
        val content =
            shortformContentRepository.saveAndFlush(
                ShortformContent(
                    platform = ShortformPlatform.YOUTUBE,
                    primaryKeywordId = 101L,
                    primaryKeywordWord = "메이드 인 코리아",
                    sourceGeneration = ShortformSourceGeneration.BOTH,
                    editorialFormat = ShortformEditorialFormat.WHY_NOW,
                    topicKey = "made-in-korea",
                    eventKey = "made-in-korea:release",
                    audienceAngle = "작품 공개로 관심이 높아진 배경",
                    selectionReason = "최신 크롤링 근거가 있습니다.",
                    title = "메이드 인 코리아가 지금 주목받는 이유",
                    contentHash = "a".repeat(64),
                    sourceCrawlRunId = 501L,
                    selectedAt = LocalDateTime.of(2026, 8, 20, 12, 0),
                ),
            )
        shortformContentKeywordSnapshotRepository.saveAndFlush(
            ShortformContentKeywordSnapshot(
                shortformContentId = requireNotNull(content.id),
                keywordId = 101L,
                keywordWord = "메이드 인 코리아",
                role = ShortformKeywordRole.PRIMARY,
                displayOrder = 0,
            ),
        )

        mockMvc
            .perform(
                get("/api/ops/media/contents")
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_API_KEY)
                    .param("from", "2026-08-01T00:00:00"),
            ).andExpect(status().isOk)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.contents.length()").value(1))
            .andExpect(jsonPath("$.data.contents[0].status").value("DRAFT"))
            .andExpect(jsonPath("$.data.contents[0].primaryKeywordWord").value("메이드 인 코리아"))
            .andExpect(jsonPath("$.data.contents[0].keywords[0].role").value("PRIMARY"))
    }

    @Test
    fun `reserveDraft returns created draft`() {
        mockMvc
            .perform(
                post("/api/ops/media/contents")
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_API_KEY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(RESERVE_DRAFT_REQUEST),
            ).andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.keywords.length()").value(2))
    }

    @Test
    fun `register and review render artifact require the exact current artifact hash`() {
        val content = shortformContentRepository.saveAndFlush(shortformContent())
        val contentId = requireNotNull(content.id)

        mockMvc
            .perform(
                post("/api/ops/media/contents/$contentId/render-artifacts")
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_API_KEY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(RENDER_ARTIFACT_REQUEST),
            ).andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content.status").value("REVIEW_REQUIRED"))
            .andExpect(jsonPath("$.data.artifact.artifactHash").value("${"b".repeat(64)}"))

        mockMvc
            .perform(
                post("/api/ops/media/contents/$contentId/reviews")
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_API_KEY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(APPROVE_REVIEW_REQUEST),
            ).andExpect(status().isCreated)
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content.status").value("APPROVED"))
            .andExpect(jsonPath("$.data.review.decision").value("APPROVED"))
            .andExpect(jsonPath("$.data.review.reviewer").value("operator"))
    }

    @Test
    fun `register render artifact validates SHA-256 fields`() {
        val content = shortformContentRepository.saveAndFlush(shortformContent())

        mockMvc
            .perform(
                post("/api/ops/media/contents/${content.id}/render-artifacts")
                    .header(MediaOperationsApiInterceptor.API_KEY_HEADER, TEST_API_KEY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(RENDER_ARTIFACT_REQUEST.replace("${"b".repeat(64)}", "not-a-hash")),
            ).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"))
    }

    private fun shortformContent() =
        ShortformContent(
            platform = ShortformPlatform.YOUTUBE,
            primaryKeywordId = 101L,
            primaryKeywordWord = "재혼 황후",
            sourceGeneration = ShortformSourceGeneration.TWENTY,
            editorialFormat = ShortformEditorialFormat.WHY_NOW,
            topicKey = "the-remarried-empress",
            eventKey = "the-remarried-empress:trailer",
            audienceAngle = "작품 공개로 관심이 높아진 배경",
            selectionReason = "공식 영상 근거가 있습니다.",
            title = "재혼 황후가 지금 주목받는 이유",
            contentHash = "a".repeat(64),
            sourceCrawlRunId = 501L,
            selectedAt = LocalDateTime.of(2026, 8, 27, 12, 0),
        )

    private companion object {
        const val TEST_API_KEY = "test-media-operations-key"
        val RESERVE_DRAFT_REQUEST =
            """
            {
              "platform": "YOUTUBE",
              "primaryKeywordId": 101,
              "primaryKeywordWord": "메이드 인 코리아",
              "sourceGeneration": "BOTH",
              "editorialFormat": "WHY_NOW",
              "topicKey": "made-in-korea",
              "eventKey": "made-in-korea:release",
              "audienceAngle": "작품 공개로 관심이 높아진 배경",
              "selectionReason": "최신 크롤링에서 작품명과 출연 배우가 함께 확인되었습니다.",
              "title": "메이드 인 코리아가 지금 주목받는 이유",
              "contentHash": "${"a".repeat(64)}",
              "sourceCrawlRunId": 501,
              "relatedKeywords": [
                {
                  "keywordId": 102,
                  "keywordWord": "현빈"
                }
              ]
            }
            """.trimIndent()

        val RENDER_ARTIFACT_REQUEST =
            """
            {
              "contentHash": "${"a".repeat(64)}",
              "artifactHash": "${"b".repeat(64)}",
              "sourceManifestHash": "${"c".repeat(64)}",
              "audioManifestHash": "${"d".repeat(64)}",
              "renderPropsHash": "${"e".repeat(64)}",
              "videoHash": "${"f".repeat(64)}",
              "ttsModel": "gemini-2.5-flash-preview-tts",
              "ttsVoice": "Kore",
              "durationMillis": 48384,
              "width": 1080,
              "height": 1920,
              "fps": 30,
              "videoCodec": "h264",
              "audioCodec": "aac"
            }
            """.trimIndent()

        val APPROVE_REVIEW_REQUEST =
            """
            {
              "artifactHash": "${"b".repeat(64)}",
              "decision": "APPROVED",
              "reviewer": "operator",
              "reason": "전체 영상과 대표 장면을 확인했습니다."
            }
            """.trimIndent()
    }
}
