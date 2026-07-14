package com.mztrend.service.crawling.candidate

import com.mztrend.client.NaverDataLabTrendClient
import com.mztrend.client.dto.NaverSearchTrendDataPoint
import com.mztrend.client.dto.NaverSearchTrendRequest
import com.mztrend.client.dto.NaverSearchTrendResponse
import com.mztrend.client.dto.NaverSearchTrendResult
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import java.time.Clock
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class NaverDataLabTrendScorerTest {
    @Test
    fun `score requests naver trend by generation age groups and ranks keywords`() {
        val fakeClient =
            FakeNaverDataLabTrendClient { request ->
                NaverSearchTrendResponse(
                    startDate = request.startDate,
                    endDate = request.endDate,
                    timeUnit = request.timeUnit,
                    results =
                        listOf(
                            result("아이브", 60.0, 100.0),
                            result("마라탕후루", 20.0, 40.0),
                        ),
                )
            }
        val scorer = scorer(fakeClient)

        val scoredKeywords =
            scorer.score(
                candidates =
                    listOf(
                        candidate(
                            "아이브",
                            rank = 1,
                            score = 1000,
                            evidenceVideos =
                                listOf(
                                    TrendCandidateEvidenceVideo(
                                        videoId = "evidence-1",
                                        title = "아이브 신곡 공개",
                                        channelName = "공식 채널",
                                    ),
                                ),
                        ),
                        candidate("마라탕후루", rank = 2, score = 900),
                    ),
                generation = Generation.TEEN,
            )

        assertEquals(1, fakeClient.requests.size)
        val request = fakeClient.requests.single()
        assertEquals("2026-05-03", request.startDate)
        assertEquals("2026-06-01", request.endDate)
        assertEquals("date", request.timeUnit)
        assertEquals("mo", request.device)
        assertContentEquals(listOf("2"), request.ages)
        assertContentEquals(listOf("아이브", "마라탕후루"), request.keywordGroups.map { it.groupName })

        assertEquals(2, scoredKeywords.size)
        assertEquals("아이브", scoredKeywords[0].word)
        assertEquals(1, scoredKeywords[0].rank)
        assertEquals(Generation.TEEN, scoredKeywords[0].generation)
        assertEquals(LocalDateTime.of(2026, 6, 1, 3, 0), scoredKeywords[0].collectedAt)
        assertEquals("evidence-1", scoredKeywords[0].evidenceVideos.single().videoId)
        assertEquals("마라탕후루", scoredKeywords[1].word)
    }

    @Test
    fun `score chunks candidates with common anchor for comparable naver ratios`() {
        val fakeClient =
            FakeNaverDataLabTrendClient { request ->
                val isSecondChunk = request.keywordGroups.any { it.groupName == "후보5" }
                NaverSearchTrendResponse(
                    startDate = request.startDate,
                    endDate = request.endDate,
                    timeUnit = request.timeUnit,
                    results = request.keywordGroups.map { group -> result(group.groupName, ratioFor(group.groupName, isSecondChunk)) },
                )
            }
        val scorer =
            scorer(
                fakeClient,
                naver =
                    ExternalApiProperties.Naver(
                        clientId = "id",
                        clientSecret = "secret",
                        maxKeywordGroupSize = 3,
                        maxCandidateCount = 5,
                    ),
            )

        val scoredKeywords =
            scorer.score(
                candidates =
                    listOf(
                        candidate("앵커", rank = 1, score = 1000),
                        candidate("후보2", rank = 2, score = 900),
                        candidate("후보3", rank = 3, score = 800),
                        candidate("후보4", rank = 4, score = 700),
                        candidate("후보5", rank = 5, score = 600),
                    ),
                generation = Generation.TWENTY,
            )

        assertEquals(2, fakeClient.requests.size)
        fakeClient.requests.forEach { request ->
            assertContentEquals(listOf("3", "4"), request.ages)
            assertEquals("앵커", request.keywordGroups.first().groupName)
            assertTrue(request.keywordGroups.size <= 3)
        }
        assertContentEquals(listOf("앵커", "후보2", "후보3"), fakeClient.requests[0].keywordGroups.map { it.groupName })
        assertContentEquals(listOf("앵커", "후보4", "후보5"), fakeClient.requests[1].keywordGroups.map { it.groupName })
        assertEquals("후보5", scoredKeywords.first().word)
    }

    @Test
    fun `score returns empty result without naver call when candidates are empty`() {
        val fakeClient = FakeNaverDataLabTrendClient { error("Naver should not be called.") }
        val scorer = scorer(fakeClient)

        val scoredKeywords = scorer.score(emptyList(), Generation.TEEN)

        assertTrue(scoredKeywords.isEmpty())
        assertTrue(fakeClient.requests.isEmpty())
    }

    @Test
    fun `score filters candidates below minimum search ratio`() {
        val fakeClient =
            FakeNaverDataLabTrendClient { request ->
                NaverSearchTrendResponse(
                    startDate = request.startDate,
                    endDate = request.endDate,
                    timeUnit = request.timeUnit,
                    results =
                        listOf(
                            result("낮은검색량", 0.1, 0.5),
                            result("충분한검색량", 2.0, 3.0),
                        ),
                )
            }
        val scorer =
            scorer(
                fakeClient,
                naver =
                    ExternalApiProperties.Naver(
                        clientId = "id",
                        clientSecret = "secret",
                        minSearchRatio = 1.0,
                    ),
            )

        val scoredKeywords =
            scorer.score(
                candidates =
                    listOf(
                        candidate("낮은검색량", rank = 1, score = 1000),
                        candidate("충분한검색량", rank = 2, score = 900),
                    ),
                generation = Generation.TEEN,
            )

        assertEquals(1, scoredKeywords.size)
        assertEquals("충분한검색량", scoredKeywords.single().word)
    }

    private fun scorer(
        fakeClient: FakeNaverDataLabTrendClient,
        naver: ExternalApiProperties.Naver =
            ExternalApiProperties.Naver(
                clientId = "id",
                clientSecret = "secret",
            ),
    ): NaverDataLabTrendScorer =
        NaverDataLabTrendScorer(
            naverDataLabTrendClient = fakeClient,
            properties = ExternalApiProperties(naver = naver),
            clock = Clock.fixed(Instant.parse("2026-05-31T18:00:00Z"), ZoneId.of("Asia/Seoul")),
        )

    private fun candidate(
        word: String,
        rank: Int,
        score: Long,
        evidenceVideos: List<TrendCandidateEvidenceVideo> = emptyList(),
    ): TrendCandidate =
        TrendCandidate(
            word = word,
            source = TrendCandidateSourceType.YOUTUBE_POPULAR,
            rank = rank,
            score = score,
            evidenceCount = 1,
            totalViewCount = score,
            collectedAt = LocalDateTime.of(2026, 6, 1, 3, 0),
            evidenceVideos = evidenceVideos,
        )

    private fun result(
        word: String,
        vararg ratios: Double,
    ): NaverSearchTrendResult =
        NaverSearchTrendResult(
            title = word,
            keywords = listOf(word),
            data =
                ratios.mapIndexed { index, ratio ->
                    NaverSearchTrendDataPoint(
                        period = "2026-05-${30 + index}",
                        ratio = ratio,
                    )
                },
        )

    private fun ratioFor(
        word: String,
        isSecondChunk: Boolean,
    ): Double =
        when (word) {
            "앵커" -> if (isSecondChunk) 50.0 else 100.0
            "후보2" -> 60.0
            "후보3" -> 30.0
            "후보4" -> 80.0
            "후보5" -> 100.0
            else -> 0.0
        }

    private class FakeNaverDataLabTrendClient(
        private val responseFactory: (NaverSearchTrendRequest) -> NaverSearchTrendResponse,
    ) : NaverDataLabTrendClient {
        val requests = mutableListOf<NaverSearchTrendRequest>()

        override fun searchTrend(request: NaverSearchTrendRequest): NaverSearchTrendResponse {
            requests.add(request)
            return responseFactory(request)
        }
    }
}
