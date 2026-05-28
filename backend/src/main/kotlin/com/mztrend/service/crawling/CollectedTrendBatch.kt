package com.mztrend.service.crawling

import com.mztrend.domain.FeedSection
import com.mztrend.domain.Generation
import com.mztrend.domain.RankTrend
import com.mztrend.domain.TrendVideoKeywordRelationType
import java.time.LocalDateTime

data class CollectedTrendBatch(
    val generation: Generation,
    val keywords: List<CollectedKeyword>,
    val videos: List<CollectedVideo>,
    val feedItems: List<CollectedFeedItem>,
    val videoKeywords: List<CollectedVideoKeyword> = emptyList(),
    val keywordRelations: List<CollectedKeywordRelation> = emptyList(),
)

data class CollectedKeyword(
    val word: String,
    val category: String? = null,
    val currentRank: Int? = null,
    val trendScore: Long? = null,
    val rankTrend: RankTrend? = null,
    val rankDelta: Int? = null,
    val explain: String? = null,
    val explainedAt: LocalDateTime? = null,
) {
    init {
        require(word.isNotBlank()) { "Collected keyword word must not be blank." }
    }
}

data class CollectedVideo(
    val youtubeVideoId: String,
    val title: String,
    val channelId: String? = null,
    val channelName: String,
    val channelCategory: String? = null,
    val channelSubscriberCount: Long? = null,
    val thumbnailUrl: String? = null,
    val viewCount: Long? = null,
    val publishedAt: LocalDateTime? = null,
    val durationSeconds: Int? = null,
    val collectedAt: LocalDateTime = LocalDateTime.now(),
) {
    init {
        require(youtubeVideoId.isNotBlank()) { "Collected video id must not be blank." }
        require(title.isNotBlank()) { "Collected video title must not be blank." }
        require(channelName.isNotBlank()) { "Collected video channel name must not be blank." }
    }
}

data class CollectedFeedItem(
    val keywordWord: String,
    val youtubeVideoId: String,
    val feedSection: FeedSection? = null,
    val displayOrder: Int = 0,
    val score: Int? = null,
    val badge: String? = null,
    val source: String? = null,
    val collectedAt: LocalDateTime = LocalDateTime.now(),
) {
    init {
        require(keywordWord.isNotBlank()) { "Collected feed item keyword word must not be blank." }
        require(youtubeVideoId.isNotBlank()) { "Collected feed item video id must not be blank." }
    }
}

data class CollectedVideoKeyword(
    val keywordWord: String,
    val youtubeVideoId: String,
    val relationType: TrendVideoKeywordRelationType,
    val displayOrder: Int = 0,
    val score: Int? = null,
    val source: String? = null,
) {
    init {
        require(keywordWord.isNotBlank()) { "Collected video keyword word must not be blank." }
        require(youtubeVideoId.isNotBlank()) { "Collected video keyword video id must not be blank." }
    }
}

data class CollectedKeywordRelation(
    val keywordWord: String,
    val relatedKeywordWord: String,
    val displayOrder: Int = 0,
    val score: Int? = null,
    val source: String? = null,
) {
    init {
        require(keywordWord.isNotBlank()) { "Collected relation keyword word must not be blank." }
        require(relatedKeywordWord.isNotBlank()) { "Collected relation related keyword word must not be blank." }
        require(keywordWord != relatedKeywordWord) { "Collected relation must not reference itself." }
    }
}
