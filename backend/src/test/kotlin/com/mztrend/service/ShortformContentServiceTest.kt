package com.mztrend.service

import com.mztrend.domain.ShortformContentStatus
import com.mztrend.domain.ShortformEditorialFormat
import com.mztrend.domain.ShortformKeywordRole
import com.mztrend.domain.ShortformPlatform
import com.mztrend.domain.ShortformSourceGeneration
import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import com.mztrend.repository.command.ShortformContentKeywordSnapshotRepository
import com.mztrend.repository.command.ShortformContentRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

@SpringBootTest
@ActiveProfiles("test")
class ShortformContentServiceTest {
    @Autowired
    private lateinit var shortformContentService: ShortformContentService

    @Autowired
    private lateinit var shortformContentRepository: ShortformContentRepository

    @Autowired
    private lateinit var shortformContentKeywordSnapshotRepository: ShortformContentKeywordSnapshotRepository

    @BeforeEach
    fun setUp() {
        shortformContentKeywordSnapshotRepository.deleteAllInBatch()
        shortformContentRepository.deleteAllInBatch()
    }

    @Test
    fun `reserveDraft persists draft and keyword snapshots`() {
        val result = shortformContentService.reserveDraft(command())

        assertEquals(ShortformContentStatus.DRAFT, result.status)
        assertEquals("메이드 인 코리아", result.primaryKeywordWord)
        assertEquals(2, result.keywords.size)
        assertEquals(
            listOf(ShortformKeywordRole.PRIMARY, ShortformKeywordRole.RELATED),
            result.keywords.map { it.role },
        )

        val savedContent = shortformContentRepository.findAll().single()
        assertEquals(result.id, savedContent.id)
        assertEquals("made-in-korea:release", savedContent.eventKey)
        assertEquals(2, shortformContentKeywordSnapshotRepository.findAll().size)
    }

    @Test
    fun `reserveDraft rejects active duplicate event key`() {
        shortformContentService.reserveDraft(command())

        val exception =
            assertFailsWith<MzTrendException> {
                shortformContentService.reserveDraft(
                    command(contentHash = "b".repeat(64)),
                )
            }

        assertEquals(ErrorCode.DUPLICATE_MEDIA_CONTENT, exception.errorCode)
        assertEquals(1, shortformContentRepository.count())
    }

    @Test
    fun `reserveDraft rejects duplicate content hash`() {
        shortformContentService.reserveDraft(command())

        val exception =
            assertFailsWith<MzTrendException> {
                shortformContentService.reserveDraft(
                    command(eventKey = "made-in-korea:cast-interview"),
                )
            }

        assertEquals(ErrorCode.DUPLICATE_MEDIA_CONTENT, exception.errorCode)
        assertEquals(1, shortformContentRepository.count())
    }

    @Test
    fun `reserveDraft rejects duplicate related keyword ids without persisting content`() {
        val exception =
            assertFailsWith<MzTrendException> {
                shortformContentService.reserveDraft(
                    command(
                        relatedKeywords =
                            listOf(
                                ShortformKeywordCommand(keywordId = 102L, keywordWord = "현빈"),
                                ShortformKeywordCommand(keywordId = 102L, keywordWord = "HYUN BIN"),
                            ),
                    ),
                )
            }

        assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode)
        assertEquals(0, shortformContentRepository.count())
        assertEquals(0, shortformContentKeywordSnapshotRepository.count())
    }

    @Test
    fun `reserveDraft rejects primary keyword in related keywords without persisting content`() {
        val exception =
            assertFailsWith<MzTrendException> {
                shortformContentService.reserveDraft(
                    command(
                        relatedKeywords =
                            listOf(
                                ShortformKeywordCommand(keywordId = 101L, keywordWord = "메이드 인 코리아"),
                            ),
                    ),
                )
            }

        assertEquals(ErrorCode.INVALID_REQUEST, exception.errorCode)
        assertEquals(0, shortformContentRepository.count())
        assertEquals(0, shortformContentKeywordSnapshotRepository.count())
    }

    private fun command(
        eventKey: String = "made-in-korea:release",
        contentHash: String = "a".repeat(64),
        relatedKeywords: List<ShortformKeywordCommand> =
            listOf(
                ShortformKeywordCommand(
                    keywordId = 102L,
                    keywordWord = "현빈",
                ),
            ),
    ): ReserveShortformDraftCommand =
        ReserveShortformDraftCommand(
            platform = ShortformPlatform.YOUTUBE,
            primaryKeywordId = 101L,
            primaryKeywordWord = "메이드 인 코리아",
            sourceGeneration = ShortformSourceGeneration.BOTH,
            editorialFormat = ShortformEditorialFormat.WHY_NOW,
            topicKey = "made-in-korea",
            eventKey = eventKey,
            audienceAngle = "작품 공개로 관심이 높아진 배경",
            selectionReason = "최신 크롤링에서 작품명과 출연 배우가 함께 확인되었습니다.",
            title = "메이드 인 코리아가 지금 주목받는 이유",
            contentHash = contentHash,
            sourceCrawlRunId = 501L,
            relatedKeywords = relatedKeywords,
        )
}
