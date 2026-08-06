package com.mztrend.service.crawling.candidate

import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class TrendCandidatePostProcessorTest {
    private val postProcessor = TrendCandidatePostProcessor()

    @Test
    fun `process removes blocked generic candidates`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("혜안", score = 100),
                    candidate("by", score = 1_000),
                    candidate("game", score = 900),
                    candidate("football", score = 800),
                    candidate("showcase", score = 700),
                    candidate("www.youtube.com", score = 600),
                    candidate("채널", score = 500),
                    candidate("게임", score = 400),
                    candidate("리뷰", score = 300),
                ),
            )

        assertEquals(listOf("혜안"), processed.map { it.word })
        assertEquals(listOf(1), processed.map { it.rank })
    }

    @Test
    fun `process removes exact platform candidates and reranks remaining candidates`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("치지직", score = 1_000),
                    candidate("CHZZK", score = 900),
                    candidate("치지직컵", score = 800),
                    candidate("아이브", score = 700),
                ),
            )

        assertEquals(listOf("치지직컵", "아이브"), processed.map { it.word })
        assertEquals(listOf(1, 2), processed.map { it.rank })
    }

    @Test
    fun `process keeps phrase candidate and removes split phrase tokens`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("ICONIC BY MISTAKE", score = 100),
                    candidate("iconic", score = 500),
                    candidate("by", score = 1_000),
                    candidate("mistake", score = 400),
                    candidate("KATSEYE", score = 50),
                ),
            )

        assertEquals(listOf("ICONIC BY MISTAKE", "KATSEYE"), processed.map { it.word })
        assertFalse(processed.any { it.word == "iconic" })
        assertFalse(processed.any { it.word == "mistake" })
    }

    @Test
    fun `process removes noisy title phrases without removing meaningful tokens`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("다비치 컴백 무대", score = 2_000),
                    candidate("다비치", score = 100),
                    candidate("fallbackword 단독 영상", score = 1_500),
                    candidate("fallbackword", score = 90),
                ),
            )

        assertEquals(listOf("다비치", "fallbackword"), processed.map { it.word })
    }

    @Test
    fun `process does not remove token candidates from noisy title phrases`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("2026 MapleStory SUMMER SHOWCASE - OVERDRIVE", score = 2_000),
                    candidate("OVERDRIVE", score = 100),
                ),
            )

        assertEquals(listOf("overdrive"), processed.map { it.word })
    }

    @Test
    fun `process keeps full Korean title and removes contextual fragments without independent evidence`() {
        val titleEvidence =
            evidenceVideo(
                videoId = "made-in-korea",
                title = "메이드 인 코리아 | 공식 예고편",
                tags = listOf("메이드 인 코리아", "코리아"),
            )
        val processed =
            postProcessor.process(
                listOf(
                    candidate("메이드 인 코리아", score = 100, evidenceVideos = listOf(titleEvidence)),
                    candidate("코리아", score = 1_000, evidenceVideos = listOf(titleEvidence)),
                    candidate(
                        "summer",
                        score = 900,
                        evidenceVideos =
                            listOf(
                                evidenceVideo(
                                    videoId = "showcase",
                                    title = "2026 MapleStory SUMMER SHOWCASE - OVERDRIVE",
                                ),
                            ),
                    ),
                ),
            )

        assertEquals(listOf("메이드 인 코리아"), processed.map { it.word })
    }

    @Test
    fun `process keeps contextual word when metadata identifies it as a standalone title`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate(
                        "SUMMER",
                        score = 100,
                        evidenceVideos =
                            listOf(
                                evidenceVideo(
                                    videoId = "summer-song",
                                    title = "SUMMER MV",
                                ),
                            ),
                    ),
                ),
            )

        assertEquals(listOf("summer"), processed.map { it.word })
    }

    @Test
    fun `process canonicalizes and merges aliased candidates`() {
        val processed =
            postProcessor.process(
                listOf(
                    candidate("maplestory", score = 100, evidenceCount = 2, totalViewCount = 1000),
                    candidate(
                        "메이플스토리",
                        score = 300,
                        evidenceCount = 3,
                        totalViewCount = 2000,
                        evidenceVideos =
                            listOf(
                                evidenceVideo("video-1", "메이플 쇼케이스"),
                            ),
                    ),
                    candidate(
                        "메이플",
                        score = 50,
                        evidenceCount = 1,
                        totalViewCount = 500,
                        evidenceVideos =
                            listOf(
                                evidenceVideo("video-2", "메이플 신직업"),
                            ),
                    ),
                    candidate("maple", score = 25, evidenceCount = 1, totalViewCount = 250),
                    candidate("illit", score = 200),
                    candidate("katseye", score = 150),
                    candidate("hybe", score = 50),
                ),
            )

        assertEquals(listOf("메이플스토리", "ILLIT", "KATSEYE", "HYBE"), processed.map { it.word })
        val mapleStory = processed.first()
        assertEquals(475, mapleStory.score)
        assertEquals(7, mapleStory.evidenceCount)
        assertEquals(3750, mapleStory.totalViewCount)
        assertEquals(listOf("video-1", "video-2"), mapleStory.evidenceVideos.map { it.videoId })
        assertEquals(listOf(1, 2, 3, 4), processed.map { it.rank })
    }

    private fun candidate(
        word: String,
        score: Long,
        evidenceCount: Int = 1,
        totalViewCount: Long = 0,
        evidenceVideos: List<TrendCandidateEvidenceVideo> = emptyList(),
    ): TrendCandidate =
        TrendCandidate(
            word = word,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            rank = 99,
            score = score,
            evidenceCount = evidenceCount,
            totalViewCount = totalViewCount,
            collectedAt = COLLECTED_AT,
            evidenceVideos = evidenceVideos,
        )

    private fun evidenceVideo(
        videoId: String,
        title: String,
        tags: List<String> = emptyList(),
    ): TrendCandidateEvidenceVideo =
        TrendCandidateEvidenceVideo(
            videoId = videoId,
            title = title,
            channelName = "채널",
            tags = tags,
        )

    companion object {
        private val COLLECTED_AT = LocalDateTime.of(2026, 6, 14, 16, 0)
    }
}
