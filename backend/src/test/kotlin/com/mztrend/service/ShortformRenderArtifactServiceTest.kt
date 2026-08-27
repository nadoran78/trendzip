package com.mztrend.service

import com.mztrend.domain.ShortformContent
import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformReviewDecisionType
import com.mztrend.domain.ShortformSourceGeneration
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.command.ShortformContentRepository
import com.mztrend.repository.command.ShortformRenderArtifactRepository
import com.mztrend.repository.command.ShortformReviewDecisionRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

@SpringBootTest
@ActiveProfiles("test")
class ShortformRenderArtifactServiceTest {
    @Autowired
    private lateinit var shortformRenderArtifactService: ShortformRenderArtifactService

    @Autowired
    private lateinit var shortformContentRepository: ShortformContentRepository

    @Autowired
    private lateinit var shortformRenderArtifactRepository: ShortformRenderArtifactRepository

    @Autowired
    private lateinit var shortformReviewDecisionRepository: ShortformReviewDecisionRepository

    @BeforeEach
    fun setUp() {
        shortformReviewDecisionRepository.deleteAllInBatch()
        shortformRenderArtifactRepository.deleteAllInBatch()
        shortformContentRepository.deleteAllInBatch()
    }

    @Test
    fun `registerRenderArtifact records artifact and moves draft to review required`() {
        val content = saveContent()

        val result =
            shortformRenderArtifactService.registerRenderArtifact(
                requireNotNull(content.id),
                renderCommand(),
            )

        assertEquals(ShortformContentStatus.REVIEW_REQUIRED, result.content.status)
        assertNotNull(result.content.renderedAt)
        assertEquals(hash('b'), result.artifact.artifactHash)
        assertEquals(1, shortformRenderArtifactRepository.count())
        assertEquals(0, shortformReviewDecisionRepository.count())
    }

    @Test
    fun `registerRenderArtifact rejects content hash mismatch without changing draft`() {
        val content = saveContent()

        val exception =
            assertFailsWith<MzTrendException> {
                shortformRenderArtifactService.registerRenderArtifact(
                    requireNotNull(content.id),
                    renderCommand(contentHash = hash('9')),
                )
            }

        assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode)
        assertEquals(0, shortformRenderArtifactRepository.count())
        assertEquals(
            ShortformContentStatus.DRAFT,
            shortformContentRepository.findById(requireNotNull(content.id)).orElseThrow().status,
        )
    }

    @Test
    fun `registerRenderArtifact rejects duplicate artifact hash across contents`() {
        val firstContent = saveContent()
        shortformRenderArtifactService.registerRenderArtifact(requireNotNull(firstContent.id), renderCommand())
        val secondContent =
            saveContent(
                contentHash = hash('8'),
                eventKey = "the-remarried-empress:cast-interview",
            )

        val exception =
            assertFailsWith<MzTrendException> {
                shortformRenderArtifactService.registerRenderArtifact(
                    requireNotNull(secondContent.id),
                    renderCommand(contentHash = hash('8')),
                )
            }

        assertEquals(ErrorCode.DUPLICATE_MEDIA_RENDER_ARTIFACT, exception.errorCode)
        assertEquals(1, shortformRenderArtifactRepository.count())
        assertEquals(
            ShortformContentStatus.DRAFT,
            shortformContentRepository.findById(requireNotNull(secondContent.id)).orElseThrow().status,
        )
    }

    @Test
    fun `reviewRenderArtifact approves latest artifact and records reviewer decision`() {
        val content = saveContent()
        val registered =
            shortformRenderArtifactService.registerRenderArtifact(requireNotNull(content.id), renderCommand())

        val result =
            shortformRenderArtifactService.reviewRenderArtifact(
                requireNotNull(content.id),
                reviewCommand(
                    artifactHash = registered.artifact.artifactHash,
                    decision = ShortformReviewDecisionType.APPROVED,
                ),
            )

        assertEquals(ShortformContentStatus.APPROVED, result.content.status)
        assertEquals(ShortformReviewDecisionType.APPROVED, result.review.decision)
        assertEquals("operator", result.review.reviewer)
        assertEquals(1, shortformReviewDecisionRepository.count())
    }

    @Test
    fun `reviewRenderArtifact rejects previous artifact after revision render`() {
        val content = saveContent()
        val first =
            shortformRenderArtifactService.registerRenderArtifact(requireNotNull(content.id), renderCommand())
        shortformRenderArtifactService.reviewRenderArtifact(
            requireNotNull(content.id),
            reviewCommand(
                artifactHash = first.artifact.artifactHash,
                decision = ShortformReviewDecisionType.NEEDS_REVISION,
            ),
        )
        val second =
            shortformRenderArtifactService.registerRenderArtifact(
                requireNotNull(content.id),
                renderCommand(
                    artifactHash = hash('1'),
                    videoHash = hash('2'),
                ),
            )

        val exception =
            assertFailsWith<MzTrendException> {
                shortformRenderArtifactService.reviewRenderArtifact(
                    requireNotNull(content.id),
                    reviewCommand(
                        artifactHash = first.artifact.artifactHash,
                        decision = ShortformReviewDecisionType.APPROVED,
                    ),
                )
            }

        assertEquals(ErrorCode.STALE_MEDIA_RENDER_ARTIFACT, exception.errorCode)
        assertEquals(ShortformContentStatus.REVIEW_REQUIRED, second.content.status)
        assertEquals(2, shortformRenderArtifactRepository.count())
        assertEquals(1, shortformReviewDecisionRepository.count())
    }

    private fun saveContent(
        contentHash: String = hash('a'),
        eventKey: String = "the-remarried-empress:trailer",
    ): ShortformContent =
        shortformContentRepository.saveAndFlush(
            ShortformContent(
                platform = ShortformPlatform.YOUTUBE,
                status = ShortformContentStatus.DRAFT,
                primaryKeywordId = 101L,
                primaryKeywordWord = "재혼 황후",
                sourceGeneration = ShortformSourceGeneration.TWENTY,
                editorialFormat = ShortformEditorialFormat.WHY_NOW,
                topicKey = "the-remarried-empress",
                eventKey = eventKey,
                audienceAngle = "공개된 예고편으로 작품 맥락을 설명합니다.",
                selectionReason = "공식 영상 근거가 확인되었습니다.",
                title = "재혼 황후가 지금 주목받는 이유",
                contentHash = contentHash,
                sourceCrawlRunId = 501L,
                selectedAt = LocalDateTime.of(2026, 8, 27, 12, 0),
            ),
        )

    private fun renderCommand(
        contentHash: String = hash('a'),
        artifactHash: String = hash('b'),
        videoHash: String = hash('f'),
    ) = RegisterShortformRenderArtifactCommand(
        contentHash = contentHash,
        artifactHash = artifactHash,
        sourceManifestHash = hash('c'),
        audioManifestHash = hash('d'),
        renderPropsHash = hash('e'),
        videoHash = videoHash,
        ttsModel = "gemini-2.5-flash-preview-tts",
        ttsVoice = "Kore",
        durationMillis = 48_384,
        width = 1_080,
        height = 1_920,
        fps = 30,
        videoCodec = "h264",
        audioCodec = "aac",
    )

    private fun reviewCommand(
        artifactHash: String,
        decision: ShortformReviewDecisionType,
    ) = ReviewShortformRenderArtifactCommand(
        artifactHash = artifactHash,
        decision = decision,
        reviewer = "operator",
        reason = "전체 영상과 대표 장면을 확인했습니다.",
    )

    private fun hash(character: Char): String = character.toString().repeat(64)
}
