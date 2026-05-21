package com.mztrend.service

import com.mztrend.config.CacheNames
import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import com.mztrend.domain.KeywordRelation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendFeed
import com.mztrend.domain.TrendFeedKeyword
import com.mztrend.domain.TrendLog
import com.mztrend.repository.command.KeywordRelationRepository
import com.mztrend.repository.command.KeywordRepository
import com.mztrend.repository.command.TrendFeedKeywordRepository
import com.mztrend.repository.command.TrendFeedRepository
import com.mztrend.repository.command.TrendLogRepository
import com.mztrend.service.crawling.CollectedKeyword
import com.mztrend.service.crawling.CollectedKeywordRelation
import com.mztrend.service.crawling.CollectedKeywordVideoMapping
import com.mztrend.service.crawling.CollectedTrendBatch
import com.mztrend.service.crawling.CollectedVideo
import com.mztrend.service.crawling.TrendCrawlingResult
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Caching
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import kotlin.math.abs

@Service
class TrendCrawlingService(
    private val keywordRepository: KeywordRepository,
    private val trendLogRepository: TrendLogRepository,
    private val trendFeedRepository: TrendFeedRepository,
    private val trendFeedKeywordRepository: TrendFeedKeywordRepository,
    private val keywordRelationRepository: KeywordRelationRepository,
) {
    @Caching(
        evict = [
            CacheEvict(cacheNames = [CacheNames.KEYWORDS], allEntries = true),
            CacheEvict(cacheNames = [CacheNames.FEED], allEntries = true),
        ],
    )
    @Transactional
    fun saveCollectedTrends(batch: CollectedTrendBatch): TrendCrawlingResult {
        val keywordsByWord = upsertKeywords(batch.generation, batch.keywords)
        val trendLogCount = saveTrendLogs(keywordsByWord, batch.keywords)
        val videosByYoutubeVideoId = upsertVideos(batch.videos)
        val mappingCount = upsertKeywordVideoMappings(batch, keywordsByWord, videosByYoutubeVideoId)
        val relationCount = upsertKeywordRelations(batch.generation, batch.keywordRelations, keywordsByWord)

        return TrendCrawlingResult(
            keywordCount = keywordsByWord.size,
            trendLogCount = trendLogCount,
            videoCount = videosByYoutubeVideoId.size,
            keywordVideoMappingCount = mappingCount,
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
                        keywordId = requireNotNull(keyword.id),
                        rank = collectedKeyword.currentRank,
                        score = collectedKeyword.trendScore,
                    )
                }

        trendLogRepository.saveAll(logs)
        return logs.size
    }

    private fun upsertVideos(collectedVideos: List<CollectedVideo>): Map<String, TrendFeed> =
        collectedVideos
            .distinctBy { it.youtubeVideoId }
            .associate { collectedVideo ->
                val trendFeed =
                    trendFeedRepository
                        .findByYoutubeVideoId(collectedVideo.youtubeVideoId)
                        ?.applyCollectedVideo(collectedVideo)
                        ?: collectedVideo.toTrendFeed()

                val savedTrendFeed = trendFeedRepository.save(trendFeed)
                collectedVideo.youtubeVideoId to savedTrendFeed
            }

    private fun TrendFeed.applyCollectedVideo(collectedVideo: CollectedVideo): TrendFeed {
        title = collectedVideo.title
        channelId = collectedVideo.channelId ?: channelId
        channelName = collectedVideo.channelName
        channelCategory = collectedVideo.channelCategory ?: channelCategory
        channelSubscriberCount = collectedVideo.channelSubscriberCount ?: channelSubscriberCount
        thumbnailUrl = collectedVideo.thumbnailUrl ?: thumbnailUrl
        viewCount = collectedVideo.viewCount ?: viewCount
        publishedAt = collectedVideo.publishedAt ?: publishedAt
        durationSeconds = collectedVideo.durationSeconds ?: durationSeconds
        badge = collectedVideo.badge ?: badge
        collectedAt = collectedVideo.collectedAt

        return this
    }

    private fun CollectedVideo.toTrendFeed(): TrendFeed =
        TrendFeed(
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
            badge = badge,
            collectedAt = collectedAt,
        )

    private fun upsertKeywordVideoMappings(
        batch: CollectedTrendBatch,
        keywordsByWord: Map<String, Keyword>,
        videosByYoutubeVideoId: Map<String, TrendFeed>,
    ): Int {
        val mappings =
            batch.keywordVideoMappings
                .distinctBy { it.youtubeVideoId to it.keywordWord }
                .map { mapping ->
                    val keyword = resolveKeyword(batch.generation, mapping.keywordWord, keywordsByWord)
                    val trendFeed =
                        videosByYoutubeVideoId[mapping.youtubeVideoId]
                            ?: error("Collected mapping references unknown video: ${mapping.youtubeVideoId}")

                    upsertKeywordVideoMapping(mapping, trendFeed, keyword)
                }

        trendFeedKeywordRepository.saveAll(mappings)
        return mappings.size
    }

    private fun upsertKeywordVideoMapping(
        mapping: CollectedKeywordVideoMapping,
        trendFeed: TrendFeed,
        keyword: Keyword,
    ): TrendFeedKeyword {
        val trendFeedId = requireNotNull(trendFeed.id)
        val keywordId = requireNotNull(keyword.id)

        return trendFeedKeywordRepository
            .findByTrendFeedIdAndKeywordId(trendFeedId, keywordId)
            ?.apply {
                relationType = mapping.relationType
                feedSection = mapping.feedSection
                displayOrder = mapping.displayOrder
                score = mapping.score
                source = mapping.source
            }
            ?: TrendFeedKeyword(
                trendFeedId = trendFeedId,
                keywordId = keywordId,
                relationType = mapping.relationType,
                feedSection = mapping.feedSection,
                displayOrder = mapping.displayOrder,
                score = mapping.score,
                source = mapping.source,
            )
    }

    private fun upsertKeywordRelations(
        generation: Generation,
        collectedRelations: List<CollectedKeywordRelation>,
        keywordsByWord: Map<String, Keyword>,
    ): Int {
        val relations =
            collectedRelations
                .distinctBy { it.keywordWord to it.relatedKeywordWord }
                .map { relation ->
                    val keyword = resolveKeyword(generation, relation.keywordWord, keywordsByWord)
                    val relatedKeyword = resolveKeyword(generation, relation.relatedKeywordWord, keywordsByWord)

                    upsertKeywordRelation(relation, keyword, relatedKeyword)
                }

        keywordRelationRepository.saveAll(relations)
        return relations.size
    }

    private fun upsertKeywordRelation(
        relation: CollectedKeywordRelation,
        keyword: Keyword,
        relatedKeyword: Keyword,
    ): KeywordRelation {
        val keywordId = requireNotNull(keyword.id)
        val relatedKeywordId = requireNotNull(relatedKeyword.id)

        return keywordRelationRepository
            .findByKeywordIdAndRelatedKeywordId(keywordId, relatedKeywordId)
            ?.apply {
                displayOrder = relation.displayOrder
                score = relation.score
                source = relation.source
            }
            ?: KeywordRelation(
                keywordId = keywordId,
                relatedKeywordId = relatedKeywordId,
                displayOrder = relation.displayOrder,
                score = relation.score,
                source = relation.source,
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
}
