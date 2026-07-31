package com.mztrend.service

import com.mztrend.common.logger
import com.mztrend.config.CacheNames
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.KeywordRelation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendFeedItem
import com.mztrend.domain.TrendLog
import com.mztrend.domain.TrendVideo
import com.mztrend.domain.TrendVideoKeyword
import com.mztrend.repository.command.KeywordRelationBulkRepository
import com.mztrend.repository.command.KeywordRelationRepository
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendFeedItemRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.repository.command.TrendVideoKeywordRepository
import com.mztrend.repository.command.TrendVideoRepository
import com.mztrend.service.crawling.CollectedFeedItem
import com.mztrend.service.crawling.CollectedKeyword
import com.mztrend.service.crawling.CollectedKeywordRelation
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedTrendBatchValidator
import com.mztrend.service.crawling.CollectedVideo
import com.mztrend.service.crawling.CollectedVideoKeyword
import com.mztrend.service.crawling.TrendCrawlingResult
import org.springframework.cache.annotation.CacheEvict
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import kotlin.math.abs

@Service
class TrendCrawlingPersistenceService(
    private val keywordRepository: KeywordRepository,
    private val trendLogRepository: TrendLogRepository,
    private val trendVideoRepository: TrendVideoRepository,
    private val trendFeedItemRepository: TrendFeedItemRepository,
    private val trendVideoKeywordRepository: TrendVideoKeywordRepository,
    private val keywordRelationBulkRepository: KeywordRelationBulkRepository,
    private val keywordRelationRepository: KeywordRelationRepository,
    private val collectedTrendBatchValidator: CollectedTrendBatchValidator,
) {
    @CacheEvict(cacheNames = [CacheNames.FEED], allEntries = true)
    @Transactional
    fun saveCollectedTrends(
        crawlRunId: Long,
        batch: CollectedTrendBatch,
    ): TrendCrawlingResult {
        collectedTrendBatchValidator.validate(batch)

        val keywordsByWord = upsertKeywords(batch.generation, batch.keywords)
        val trendLogCount = saveTrendLogs(crawlRunId, keywordsByWord, batch.keywords)
        val videosByYoutubeVideoId = upsertVideos(batch.videos)
        val feedItemCount = replaceActiveFeedItems(batch, keywordsByWord, videosByYoutubeVideoId)
        val videoKeywordCount = upsertVideoKeywords(batch, keywordsByWord, videosByYoutubeVideoId)
        val relationCount = upsertKeywordRelations(batch.generation, batch.keywordRelations, keywordsByWord)

        return TrendCrawlingResult(
            keywordCount = keywordsByWord.size,
            trendLogCount = trendLogCount,
            videoCount = videosByYoutubeVideoId.size,
            feedItemCount = feedItemCount,
            videoKeywordCount = videoKeywordCount,
            keywordRelationCount = relationCount,
        )
    }

    private fun upsertKeywords(
        generation: Generation,
        collectedKeywords: List<CollectedKeyword>,
    ): Map<String, Keyword> =
        collectedKeywords
            .distinctBy { it.word }
            .associate { collectedKeyword ->
                val keyword =
                    keywordRepository
                        .findByGenerationAndWord(generation, collectedKeyword.word)
                        ?.applyCollectedKeyword(collectedKeyword)
                        ?: collectedKeyword.toKeyword(generation)

                val savedKeyword = keywordRepository.save(keyword)
                collectedKeyword.word to savedKeyword
            }

    private fun Keyword.applyCollectedKeyword(collectedKeyword: CollectedKeyword): Keyword {
        val previousRank = currentRank
        val resolvedRank = collectedKeyword.currentRank ?: currentRank

        category = collectedKeyword.category ?: category
        currentRank = resolvedRank
        trendScore = collectedKeyword.trendScore ?: trendScore

        if (collectedKeyword.rankTrend != null || collectedKeyword.currentRank != null) {
            rankTrend = collectedKeyword.rankTrend ?: resolveRankTrend(previousRank, collectedKeyword.currentRank, isNew = false)
        }

        if (collectedKeyword.rankDelta != null || collectedKeyword.currentRank != null) {
            rankDelta = collectedKeyword.rankDelta ?: resolveRankDelta(previousRank, collectedKeyword.currentRank)
        }

        if (collectedKeyword.explain != null) {
            explain = collectedKeyword.explain
            explainedAt = collectedKeyword.explainedAt
        }

        return this
    }

    private fun CollectedKeyword.toKeyword(generation: Generation): Keyword =
        Keyword(
            word = word,
            generation = generation,
            category = category,
            currentRank = currentRank,
            trendScore = trendScore,
            rankTrend = rankTrend ?: resolveRankTrend(previousRank = null, currentRank = currentRank, isNew = true),
            rankDelta = rankDelta,
            explain = explain,
            explainedAt = explainedAt,
        )

    private fun saveTrendLogs(
        crawlRunId: Long,
        keywordsByWord: Map<String, Keyword>,
        collectedKeywords: List<CollectedKeyword>,
    ): Int {
        val logs =
            collectedKeywords
                .filter { it.currentRank != null || it.trendScore != null }
                .distinctBy { it.word }
                .mapNotNull { collectedKeyword ->
                    val keyword = keywordsByWord[collectedKeyword.word] ?: return@mapNotNull null
                    TrendLog(
                        crawlRunId = crawlRunId,
                        keywordId = requireNotNull(keyword.id),
                        rank = collectedKeyword.currentRank,
                        score = collectedKeyword.trendScore,
                    )
                }

        trendLogRepository.saveAll(logs)
        return logs.size
    }

    private fun upsertVideos(collectedVideos: List<CollectedVideo>): Map<String, TrendVideo> =
        collectedVideos
            .distinctBy { it.youtubeVideoId }
            .associate { collectedVideo ->
                val trendVideo =
                    trendVideoRepository
                        .findByYoutubeVideoId(collectedVideo.youtubeVideoId)
                        ?.applyCollectedVideo(collectedVideo)
                        ?: collectedVideo.toTrendVideo()

                val savedTrendVideo = trendVideoRepository.save(trendVideo)
                collectedVideo.youtubeVideoId to savedTrendVideo
            }

    private fun TrendVideo.applyCollectedVideo(collectedVideo: CollectedVideo): TrendVideo {
        title = collectedVideo.title
        channelId = collectedVideo.channelId ?: channelId
        channelName = collectedVideo.channelName
        channelCategory = collectedVideo.channelCategory ?: channelCategory
        channelSubscriberCount = collectedVideo.channelSubscriberCount ?: channelSubscriberCount
        thumbnailUrl = collectedVideo.thumbnailUrl ?: thumbnailUrl
        viewCount = collectedVideo.viewCount ?: viewCount
        publishedAt = collectedVideo.publishedAt ?: publishedAt
        durationSeconds = collectedVideo.durationSeconds ?: durationSeconds
        collectedAt = collectedVideo.collectedAt

        return this
    }

    private fun CollectedVideo.toTrendVideo(): TrendVideo =
        TrendVideo(
            youtubeVideoId = youtubeVideoId,
            title = title,
            channelId = channelId,
            channelName = channelName,
            channelCategory = channelCategory,
            channelSubscriberCount = channelSubscriberCount,
            thumbnailUrl = thumbnailUrl,
            viewCount = viewCount,
            publishedAt = publishedAt,
            durationSeconds = durationSeconds,
            collectedAt = collectedAt,
        )

    private fun deactivateActiveFeedItems(generation: Generation) {
        val activeFeedItems = trendFeedItemRepository.findAllByGenerationAndIsActiveTrue(generation)
        activeFeedItems.forEach { it.isActive = false }
        trendFeedItemRepository.saveAll(activeFeedItems)
        trendFeedItemRepository.flush()
    }

    private fun replaceActiveFeedItems(
        batch: CollectedTrendBatch,
        keywordsByWord: Map<String, Keyword>,
        videosByYoutubeVideoId: Map<String, TrendVideo>,
    ): Int {
        if (batch.feedItems.isEmpty()) {
            log.warn(
                "Skip feed item replacement because collected feed items are empty. generation={}",
                batch.generation,
            )
            return 0
        }

        deactivateActiveFeedItems(batch.generation)
        return createFeedItems(batch, keywordsByWord, videosByYoutubeVideoId)
    }

    private fun createFeedItems(
        batch: CollectedTrendBatch,
        keywordsByWord: Map<String, Keyword>,
        videosByYoutubeVideoId: Map<String, TrendVideo>,
    ): Int {
        val feedItems =
            batch.feedItems
                .map { feedItem ->
                    val keyword = resolveKeyword(batch.generation, feedItem.keywordWord, keywordsByWord)
                    val trendVideo =
                        videosByYoutubeVideoId[feedItem.youtubeVideoId]
                            ?: error("Collected feed item references unknown video: ${feedItem.youtubeVideoId}")

                    feedItem.toTrendFeedItem(batch.generation, trendVideo, keyword)
                }

        trendFeedItemRepository.saveAll(feedItems)
        return feedItems.size
    }

    private fun CollectedFeedItem.toTrendFeedItem(
        generation: Generation,
        trendVideo: TrendVideo,
        keyword: Keyword,
    ): TrendFeedItem =
        TrendFeedItem(
            generation = generation,
            trendVideoId = requireNotNull(trendVideo.id),
            primaryKeywordId = requireNotNull(keyword.id),
            feedSection = feedSection,
            displayOrder = displayOrder,
            score = score,
            badge = badge,
            source = source,
            isActive = true,
            collectedAt = collectedAt,
        )

    private fun upsertVideoKeywords(
        batch: CollectedTrendBatch,
        keywordsByWord: Map<String, Keyword>,
        videosByYoutubeVideoId: Map<String, TrendVideo>,
    ): Int {
        val videoKeywords =
            batch.videoKeywords
                .distinctBy { it.youtubeVideoId to it.keywordWord }
                .map { videoKeyword ->
                    val keyword = resolveKeyword(batch.generation, videoKeyword.keywordWord, keywordsByWord)
                    val trendVideo =
                        videosByYoutubeVideoId[videoKeyword.youtubeVideoId]
                            ?: error("Collected video keyword references unknown video: ${videoKeyword.youtubeVideoId}")

                    upsertVideoKeyword(videoKeyword, trendVideo, keyword)
                }

        trendVideoKeywordRepository.saveAll(videoKeywords)
        return videoKeywords.size
    }

    private fun upsertVideoKeyword(
        videoKeyword: CollectedVideoKeyword,
        trendVideo: TrendVideo,
        keyword: Keyword,
    ): TrendVideoKeyword {
        val trendVideoId = requireNotNull(trendVideo.id)
        val keywordId = requireNotNull(keyword.id)

        return trendVideoKeywordRepository
            .findByTrendVideoIdAndKeywordId(trendVideoId, keywordId)
            ?.apply {
                relationType = videoKeyword.relationType
                displayOrder = videoKeyword.displayOrder
                score = videoKeyword.score
                source = videoKeyword.source
            }
            ?: TrendVideoKeyword(
                trendVideoId = trendVideoId,
                keywordId = keywordId,
                relationType = videoKeyword.relationType,
                displayOrder = videoKeyword.displayOrder,
                score = videoKeyword.score,
                source = videoKeyword.source,
            )
    }

    private fun upsertKeywordRelations(
        generation: Generation,
        collectedRelations: List<CollectedKeywordRelation>,
        keywordsByWord: Map<String, Keyword>,
    ): Int {
        val keywordIds = keywordsByWord.values.mapNotNull { it.id }
        keywordRelationBulkRepository.deactivateActiveByKeywordIdIn(keywordIds, LocalDateTime.now())

        val relations =
            collectedRelations
                .distinctBy { it.keywordWord to it.relatedKeywordWord }
                .map { relation ->
                    val keyword = resolveKeyword(generation, relation.keywordWord, keywordsByWord)
                    val relatedKeyword = resolveKeyword(generation, relation.relatedKeywordWord, keywordsByWord)

                    relation.toKeywordRelation(keyword, relatedKeyword)
                }

        keywordRelationRepository.saveAll(relations)
        return relations.size
    }

    private fun CollectedKeywordRelation.toKeywordRelation(
        keyword: Keyword,
        relatedKeyword: Keyword,
    ): KeywordRelation {
        val keywordId = requireNotNull(keyword.id)
        val relatedKeywordId = requireNotNull(relatedKeyword.id)

        return KeywordRelation(
            keywordId = keywordId,
            relatedKeywordId = relatedKeywordId,
            displayOrder = displayOrder,
            score = score,
            source = source,
        )
    }

    private fun resolveKeyword(
        generation: Generation,
        word: String,
        keywordsByWord: Map<String, Keyword>,
    ): Keyword =
        keywordsByWord[word]
            ?: keywordRepository.findByGenerationAndWord(generation, word)
            ?: error("Collected relation references unknown keyword: $word")

    private fun resolveRankTrend(
        previousRank: Int?,
        currentRank: Int?,
        isNew: Boolean,
    ): RankTrend? {
        if (currentRank == null) return null
        if (isNew || previousRank == null) return RankTrend.NEW

        return when {
            currentRank < previousRank -> RankTrend.UP
            currentRank > previousRank -> RankTrend.DOWN
            else -> RankTrend.SAME
        }
    }

    private fun resolveRankDelta(
        previousRank: Int?,
        currentRank: Int?,
    ): Int? {
        if (previousRank == null || currentRank == null) return null
        return abs(previousRank - currentRank)
    }

    companion object {
        private val log = logger<TrendCrawlingPersistenceService>()
    }
}
