package com.mztrend.config

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.service.TrendCrawlingService
import com.mztrend.service.crawling.CollectedFeedItem
import com.mztrend.service.crawling.CollectedKeyword
import com.mztrend.service.crawling.CollectedKeywordRelation
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedVideo
import com.mztrend.service.crawling.CollectedVideoKeyword
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Component
@Profile("local")
@ConditionalOnProperty(prefix = "app.local-data", name = ["enabled"], havingValue = "true")
class LocalDataInitializer(
    private val trendCrawlingService: TrendCrawlingService,
    private val keywordRepository: KeywordRepository,
    private val trendLogRepository: TrendLogRepository,
) : ApplicationRunner {
    @Transactional
    override fun run(args: ApplicationArguments) {
        val batches = listOf(teenBatch(), twentyBatch())

        deleteSeedTrendLogs(batches)
        batches.forEach(trendCrawlingService::saveCollectedTrends)
    }

    private fun deleteSeedTrendLogs(batches: List<CollectedTrendBatch>) {
        val keywordIds =
            batches
                .flatMap { batch ->
                    val words = batch.keywords.map { it.word }.toSet()

                    keywordRepository
                        .findAllByGenerationAndWordIn(batch.generation, words)
                        .mapNotNull { it.id }
                }

        if (keywordIds.isEmpty()) {
            return
        }

        val trendLogs = trendLogRepository.findAllByKeywordIdIn(keywordIds)
        trendLogRepository.deleteAllInBatch(trendLogs)
    }

    private fun teenBatch(): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = Generation.TEEN,
            keywords =
                listOf(
                    CollectedKeyword(
                        word = "밤양갱 챌린지",
                        category = "음악",
                        currentRank = 1,
                        trendScore = 98_500L,
                        rankTrend = RankTrend.UP,
                        rankDelta = 3,
                        explain = "짧은 후렴과 따라 하기 쉬운 안무가 숏폼에서 반복 소비되며 10대 사이에서 확산되고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "학교 브이로그",
                        category = "일상",
                        currentRank = 2,
                        trendScore = 76_300L,
                        rankTrend = RankTrend.SAME,
                        rankDelta = 0,
                        explain = "등교 준비, 급식, 쉬는 시간 같은 일상 소재가 공감형 콘텐츠로 소비되고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "탕후루",
                        category = "푸드",
                        currentRank = 3,
                        trendScore = 64_200L,
                        rankTrend = RankTrend.DOWN,
                        rankDelta = 1,
                        explain = "먹방과 리뷰 콘텐츠가 꾸준히 재생산되며 간식 트렌드 키워드로 남아 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "시험기간 플레이리스트",
                        category = "음악",
                        currentRank = 4,
                        trendScore = 51_000L,
                        rankTrend = RankTrend.NEW,
                        explain = "공부 집중용 음악과 시험기간 공감 콘텐츠가 함께 묶이며 검색량이 늘고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            videos =
                listOf(
                    CollectedVideo(
                        youtubeVideoId = "local-teen-video-1",
                        title = "요즘 10대가 따라 하는 밤양갱 챌린지 모음",
                        channelId = "local-teen-channel-1",
                        channelName = "틴즈 트렌드",
                        channelCategory = "Music",
                        channelSubscriberCount = 840_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-teen-video-1/hqdefault.jpg",
                        viewCount = 1_240_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 18, 19, 30),
                        durationSeconds = 212,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedVideo(
                        youtubeVideoId = "local-teen-video-2",
                        title = "고등학생 현실 학교 브이로그",
                        channelId = "local-teen-channel-2",
                        channelName = "오늘의 학교",
                        channelCategory = "Lifestyle",
                        channelSubscriberCount = 320_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-teen-video-2/hqdefault.jpg",
                        viewCount = 620_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 17, 8, 10),
                        durationSeconds = 489,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedVideo(
                        youtubeVideoId = "local-teen-video-3",
                        title = "탕후루 아직도 인기 있을까? 10대 인터뷰",
                        channelId = "local-teen-channel-3",
                        channelName = "푸드톡",
                        channelCategory = "Food",
                        channelSubscriberCount = 450_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-teen-video-3/hqdefault.jpg",
                        viewCount = 410_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 16, 16, 20),
                        durationSeconds = 356,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            feedItems =
                listOf(
                    CollectedFeedItem(
                        keywordWord = "밤양갱 챌린지",
                        youtubeVideoId = "local-teen-video-1",
                        feedSection = FeedSection.TODAY_PICK,
                        displayOrder = 1,
                        score = 98,
                        badge = "HOT",
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedFeedItem(
                        keywordWord = "학교 브이로그",
                        youtubeVideoId = "local-teen-video-2",
                        feedSection = FeedSection.RISING,
                        displayOrder = 1,
                        score = 91,
                        badge = "NEW",
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedFeedItem(
                        keywordWord = "탕후루",
                        youtubeVideoId = "local-teen-video-3",
                        feedSection = FeedSection.RELATED,
                        displayOrder = 1,
                        score = 82,
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            videoKeywords =
                listOf(
                    CollectedVideoKeyword(
                        keywordWord = "시험기간 플레이리스트",
                        youtubeVideoId = "local-teen-video-1",
                        relationType = TrendVideoKeywordRelationType.RELATED,
                        displayOrder = 2,
                        score = 64,
                        source = LOCAL_SEED_SOURCE,
                    ),
                ),
            keywordRelations =
                listOf(
                    CollectedKeywordRelation(
                        keywordWord = "밤양갱 챌린지",
                        relatedKeywordWord = "시험기간 플레이리스트",
                        displayOrder = 1,
                        score = 72,
                        source = LOCAL_SEED_SOURCE,
                    ),
                    CollectedKeywordRelation(
                        keywordWord = "학교 브이로그",
                        relatedKeywordWord = "탕후루",
                        displayOrder = 1,
                        score = 66,
                        source = LOCAL_SEED_SOURCE,
                    ),
                ),
        )

    private fun twentyBatch(): CollectedTrendBatch =
        CollectedTrendBatch(
            generation = Generation.TWENTY,
            keywords =
                listOf(
                    CollectedKeyword(
                        word = "퇴근 후 루틴",
                        category = "라이프스타일",
                        currentRank = 1,
                        trendScore = 88_700L,
                        rankTrend = RankTrend.UP,
                        rankDelta = 2,
                        explain = "운동, 자기계발, 취미를 묶은 현실적인 루틴 콘텐츠가 20대에게 소비되고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "가성비 데이트",
                        category = "관계",
                        currentRank = 2,
                        trendScore = 72_900L,
                        rankTrend = RankTrend.NEW,
                        explain = "물가 상승 이후 저렴하지만 만족도 높은 코스 추천 콘텐츠가 관심을 받고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "취준 브이로그",
                        category = "커리어",
                        currentRank = 3,
                        trendScore = 69_400L,
                        rankTrend = RankTrend.SAME,
                        rankDelta = 0,
                        explain = "공채 준비, 포트폴리오, 면접 준비 과정을 기록한 콘텐츠가 공감대를 얻고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedKeyword(
                        word = "러닝크루",
                        category = "운동",
                        currentRank = 4,
                        trendScore = 54_100L,
                        rankTrend = RankTrend.UP,
                        rankDelta = 1,
                        explain = "건강 관리와 소셜 모임을 함께 해결하는 방식으로 러닝크루 콘텐츠가 확산되고 있습니다.",
                        explainedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            videos =
                listOf(
                    CollectedVideo(
                        youtubeVideoId = "local-twenty-video-1",
                        title = "퇴근 후 무너지지 않는 20대 현실 루틴",
                        channelId = "local-twenty-channel-1",
                        channelName = "일상 정비소",
                        channelCategory = "Lifestyle",
                        channelSubscriberCount = 610_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-twenty-video-1/hqdefault.jpg",
                        viewCount = 930_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 18, 21, 0),
                        durationSeconds = 642,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedVideo(
                        youtubeVideoId = "local-twenty-video-2",
                        title = "서울에서 3만원으로 보내는 가성비 데이트",
                        channelId = "local-twenty-channel-2",
                        channelName = "데이트 맵",
                        channelCategory = "Travel",
                        channelSubscriberCount = 280_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-twenty-video-2/hqdefault.jpg",
                        viewCount = 540_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 15, 18, 40),
                        durationSeconds = 518,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedVideo(
                        youtubeVideoId = "local-twenty-video-3",
                        title = "취준생 하루 루틴과 면접 준비 기록",
                        channelId = "local-twenty-channel-3",
                        channelName = "커리어로그",
                        channelCategory = "Education",
                        channelSubscriberCount = 190_000L,
                        thumbnailUrl = "https://img.youtube.com/vi/local-twenty-video-3/hqdefault.jpg",
                        viewCount = 370_000L,
                        publishedAt = LocalDateTime.of(2026, 5, 14, 7, 50),
                        durationSeconds = 731,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            feedItems =
                listOf(
                    CollectedFeedItem(
                        keywordWord = "퇴근 후 루틴",
                        youtubeVideoId = "local-twenty-video-1",
                        feedSection = FeedSection.TODAY_PICK,
                        displayOrder = 1,
                        score = 95,
                        badge = "HOT",
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedFeedItem(
                        keywordWord = "가성비 데이트",
                        youtubeVideoId = "local-twenty-video-2",
                        feedSection = FeedSection.RISING,
                        displayOrder = 1,
                        score = 89,
                        badge = "NEW",
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                    CollectedFeedItem(
                        keywordWord = "취준 브이로그",
                        youtubeVideoId = "local-twenty-video-3",
                        feedSection = FeedSection.RELATED,
                        displayOrder = 1,
                        score = 84,
                        source = LOCAL_SEED_SOURCE,
                        collectedAt = FIXED_COLLECTED_AT,
                    ),
                ),
            videoKeywords =
                listOf(
                    CollectedVideoKeyword(
                        keywordWord = "러닝크루",
                        youtubeVideoId = "local-twenty-video-1",
                        relationType = TrendVideoKeywordRelationType.RELATED,
                        displayOrder = 2,
                        score = 70,
                        source = LOCAL_SEED_SOURCE,
                    ),
                ),
            keywordRelations =
                listOf(
                    CollectedKeywordRelation(
                        keywordWord = "퇴근 후 루틴",
                        relatedKeywordWord = "러닝크루",
                        displayOrder = 1,
                        score = 78,
                        source = LOCAL_SEED_SOURCE,
                    ),
                    CollectedKeywordRelation(
                        keywordWord = "취준 브이로그",
                        relatedKeywordWord = "퇴근 후 루틴",
                        displayOrder = 1,
                        score = 63,
                        source = LOCAL_SEED_SOURCE,
                    ),
                ),
        )

    companion object {
        private const val LOCAL_SEED_SOURCE = "local-seed"
        private val FIXED_COLLECTED_AT: LocalDateTime = LocalDateTime.of(2026, 5, 21, 9, 0)
    }
}
