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
        assertEquals(0, batch.keywordRelations.size)
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
        generation: Generation = Generation.TEEN,
        rank: Int = 1,
        trendScore: Long = 100_000L,
        evidenceVideos: List<TrendCandidateEvidenceVideo> = emptyList(),
    ): ScoredTrendKeyword =
        ScoredTrendKeyword(
            generation = generation,
            word = word,
            rank = rank,
            trendScore = trendScore,
            averageRatio = 50.0,
            maxRatio = 100.0,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            candidateScore = 1_000L,
            collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            evidenceVideos = evidenceVideos,
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
