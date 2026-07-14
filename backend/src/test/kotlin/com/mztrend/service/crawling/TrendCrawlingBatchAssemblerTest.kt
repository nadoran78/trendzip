package com.mztrend.service.crawling

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import com.mztrend.service.crawling.candidate.TrendCandidateEvidenceVideo
import com.mztrend.service.crawling.candidate.TrendCandidateSourceType
import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TrendCrawlingBatchAssemblerTest {
    @Test
    fun `assemble converts scored keywords and collected videos to crawling batch`() {
        val assembler =
            assembler(
                batch =
                    CollectedKeywordVideoBatch(
                        videos =
                            listOf(
                                CollectedVideo(
                                    youtubeVideoId = "video-1",
                                    title = "영상 1",
                                    channelName = "채널 1",
                                ),
                            ),
                        feedItems =
                            listOf(
                                CollectedFeedItem(
                                    keywordWord = "아이브",
                                    youtubeVideoId = "video-1",
                                    feedSection = FeedSection.TODAY_PICK,
                                    displayOrder = 1,
                                ),
                            ),
                        videoKeywords =
                            listOf(
                                CollectedVideoKeyword(
                                    keywordWord = "아이브",
                                    youtubeVideoId = "video-1",
                                    relationType = TrendVideoKeywordRelationType.RELATED,
                                ),
                            ),
                    ),
            )

        val batch =
            assembler.assemble(
                generation = Generation.TEEN,
                scoredKeywords =
                    listOf(
                        scoredKeyword("마라탕후루", rank = 2, trendScore = 70_000L),
                        scoredKeyword(
                            "아이브",
                            rank = 1,
                            trendScore = 90_000L,
                            evidenceVideos =
                                listOf(
                                    TrendCandidateEvidenceVideo(
                                        videoId = "evidence-1",
                                        title = "아이브 신곡 공개",
                                        channelName = "공식 채널",
                                        description = "후보 추출 근거",
                                        viewCount = 2_000_000L,
                                    ),
                                ),
                        ),
                    ),
            )

        assertEquals(Generation.TEEN, batch.generation)
        assertEquals(listOf("아이브", "마라탕후루"), batch.keywords.map { it.word })
        assertEquals(listOf(1, 2), batch.keywords.map { it.currentRank })
        assertEquals(listOf(90_000L, 70_000L), batch.keywords.map { it.trendScore })
        assertNull(batch.keywords[0].rankTrend)
        assertEquals(listOf(null, null), batch.keywords.map { it.explain })
        val evidenceVideo = batch.keywords[0].evidenceVideos.single()
        assertEquals("evidence-1", evidenceVideo.youtubeVideoId)
        assertEquals("후보 추출 근거", evidenceVideo.description)
        assertEquals(1, batch.videos.size)
        assertEquals(1, batch.feedItems.size)
        assertEquals(1, batch.videoKeywords.size)
        assertEquals(emptyList(), batch.keywordRelations)
    }

    @Test
    fun `assemble creates related keyword relations from shared evidence and text mentions before category fallback`() {
        val assembler = assembler()

        val batch =
            assembler.assemble(
                generation = Generation.TEEN,
                scoredKeywords =
                    listOf(
                        scoredKeyword(
                            "김부장",
                            category = "방송/영화",
                            rank = 1,
                            evidenceVideos =
                                listOf(
                                    evidenceVideo(
                                        videoId = "kim-manager-trailer",
                                        title = "김부장 공식 예고편",
                                        description = "소지섭 주연 액션 드라마",
                                    ),
                                ),
                        ),
                        scoredKeyword(
                            "리센느",
                            category = "음악",
                            rank = 2,
                            evidenceVideos = listOf(evidenceVideo(videoId = "rescene-stage", title = "리센느 Pretty Girl 무대")),
                        ),
                        scoredKeyword(
                            "소지섭",
                            category = "인물",
                            rank = 3,
                            evidenceVideos = listOf(evidenceVideo(videoId = "kim-manager-trailer", title = "소지섭 김부장 인터뷰")),
                        ),
                        scoredKeyword(
                            "호프",
                            category = "방송/영화",
                            rank = 4,
                            evidenceVideos =
                                listOf(
                                    evidenceVideo(
                                        videoId = "hope-trailer",
                                        title = "호프 공식 예고편",
                                        description = "황정민 조인성 출연",
                                    ),
                                ),
                        ),
                        scoredKeyword(
                            "황정민",
                            category = "인물",
                            rank = 5,
                            evidenceVideos = listOf(evidenceVideo(videoId = "hope-trailer", title = "황정민 호프 제작보고회")),
                        ),
                    ),
            )

        val relationsByKeyword = batch.keywordRelations.groupBy { it.keywordWord }

        assertEquals(listOf("소지섭"), relationsByKeyword.getValue("김부장").map { it.relatedKeywordWord })
        assertEquals(listOf("김부장"), relationsByKeyword.getValue("소지섭").map { it.relatedKeywordWord })
        assertEquals(listOf("황정민"), relationsByKeyword.getValue("호프").map { it.relatedKeywordWord })
        assertEquals(emptyList(), relationsByKeyword["리센느"].orEmpty())
        assertTrue(relationsByKeyword.getValue("김부장").single().score!! >= 5_000)
    }

    @Test
    fun `assemble matches reordered multi token keywords and short english tokens from evidence text`() {
        val assembler = assembler()

        val batch =
            assembler.assemble(
                generation = Generation.TEEN,
                scoredKeywords =
                    listOf(
                        scoredKeyword(
                            "MSI 2026",
                            rank = 1,
                            evidenceVideos =
                                listOf(
                                    evidenceVideo(
                                        videoId = "msi-guide",
                                        title = "2026 MSI 진행 방식",
                                        description = "T1 일정과 리그오브레전드 국제 대회 안내",
                                    ),
                                ),
                        ),
                        scoredKeyword("t1", rank = 2),
                        scoredKeyword("리그오브레전드", rank = 3),
                    ),
            )

        val relationsByKeyword = batch.keywordRelations.groupBy { it.keywordWord }

        assertEquals(listOf("t1", "리그오브레전드"), relationsByKeyword.getValue("MSI 2026").map { it.relatedKeywordWord })
        assertEquals(listOf("MSI 2026"), relationsByKeyword.getValue("t1").map { it.relatedKeywordWord })
    }

    @Test
    fun `assemble rejects scored keywords from another generation`() {
        val assembler = assembler()

        val exception =
            assertFailsWith<IllegalArgumentException> {
                assembler.assemble(
                    generation = Generation.TEEN,
                    scoredKeywords = listOf(scoredKeyword("퇴근 후 루틴", generation = Generation.TWENTY)),
                )
            }

        assertEquals("Scored trend keywords must belong to the requested generation. generation=TEEN", exception.message)
    }

    private fun assembler(batch: CollectedKeywordVideoBatch = EMPTY_VIDEO_BATCH): TrendCrawlingBatchAssembler =
        TrendCrawlingBatchAssembler(
            keywordVideoCollector = FakeKeywordVideoCollector(batch),
        )

    private fun scoredKeyword(
        word: String,
        category: String? = null,
        generation: Generation = Generation.TEEN,
        rank: Int = 1,
        trendScore: Long = 100_000L,
        evidenceVideos: List<TrendCandidateEvidenceVideo> = emptyList(),
    ): ScoredTrendKeyword =
        ScoredTrendKeyword(
            generation = generation,
            word = word,
            category = category,
            rank = rank,
            trendScore = trendScore,
            averageRatio = 50.0,
            maxRatio = 100.0,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            candidateScore = 1_000L,
            collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            evidenceVideos = evidenceVideos,
        )

    private fun evidenceVideo(
        videoId: String,
        title: String,
        description: String? = null,
    ): TrendCandidateEvidenceVideo =
        TrendCandidateEvidenceVideo(
            videoId = videoId,
            title = title,
            channelName = "테스트 채널",
            description = description,
        )

    private class FakeKeywordVideoCollector(
        private val batch: CollectedKeywordVideoBatch,
    ) : KeywordVideoCollector {
        override fun collect(
            generation: Generation,
            scoredKeywords: List<ScoredTrendKeyword>,
        ): CollectedKeywordVideoBatch = batch
    }

    companion object {
        private val EMPTY_VIDEO_BATCH =
            CollectedKeywordVideoBatch(
                videos = emptyList(),
                feedItems = emptyList(),
                videoKeywords = emptyList(),
            )
    }
}
