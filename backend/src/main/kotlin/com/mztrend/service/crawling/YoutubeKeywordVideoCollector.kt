package com.mztrend.service.crawling

import com.mztrend.client.YoutubeApiClient
import com.mztrend.client.dto.YoutubeSearchVideo
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.client.toCollectedVideo
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import com.mztrend.domain.TrendVideoKeywordRelationType
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword
import org.springframework.stereotype.Service
import java.time.Clock
import java.time.LocalDateTime
import kotlin.math.min

@Service
class YoutubeKeywordVideoCollector(
    private val youtubeApiClient: YoutubeApiClient,
    private val properties: ExternalApiProperties,
    private val clock: Clock,
    private val feedCurationPolicy: FeedCurationPolicy,
) : KeywordVideoCollector {
    override fun collect(
        generation: Generation,
        scoredKeywords: List<ScoredTrendKeyword>,
    ): CollectedKeywordVideoBatch {
        val targetKeywords =
            scoredKeywords
                .filter { it.generation == generation }
                .sortedBy { it.rank }
                .take(properties.youtube.keywordSearchMaxKeywords)

        if (targetKeywords.isEmpty()) return EMPTY_BATCH

        val searchAssignments = searchVideos(generation, targetKeywords)
        if (searchAssignments.isEmpty()) return EMPTY_BATCH

        val videoDetailsById = fetchVideoDetails(searchAssignments)
        val channelDetailsById =
            youtubeApiClient
                .getChannelDetails(videoDetailsById.values.mapNotNull { it.channelId })
                .associateBy { it.channelId }
        val collectedAt = LocalDateTime.now(clock)

        val videos =
            videoDetailsById.values.map { videoDetail ->
                videoDetail.toCollectedVideo(
                    channelDetail = videoDetail.channelId?.let(channelDetailsById::get),
                    collectedAt = collectedAt,
                )
            }
        val feedCandidates = buildFeedCandidates(searchAssignments, videoDetailsById)
        val feedItems = feedCurationPolicy.curate(feedCandidates, collectedAt)
        val videoKeywords = buildVideoKeywords(searchAssignments, videoDetailsById)

        return CollectedKeywordVideoBatch(
            videos = videos,
            feedItems = feedItems,
            videoKeywords = videoKeywords,
        )
    }

    private fun searchVideos(
        generation: Generation,
        scoredKeywords: List<ScoredTrendKeyword>,
    ): List<SearchVideoAssignment> =
        scoredKeywords.flatMap { scoredKeyword ->
            val videos =
                youtubeApiClient.searchVideos(
                    keyword = scoredKeyword.word,
                    generation = generation,
                    maxResults = properties.youtube.keywordSearchMaxResults,
                )

            videos.mapIndexed { index, video ->
                SearchVideoAssignment(
                    keyword = scoredKeyword,
                    video = video,
                    searchOrder = index + 1,
                )
            }
        }

    private fun fetchVideoDetails(assignments: List<SearchVideoAssignment>): Map<String, YoutubeVideoDetail> {
        val videoIds = assignments.map { it.video.videoId }.distinct()

        return youtubeApiClient
            .getVideoDetails(videoIds)
            .associateBy { it.videoId }
    }

    private fun buildFeedCandidates(
        assignments: List<SearchVideoAssignment>,
        videoDetailsById: Map<String, YoutubeVideoDetail>,
    ): List<FeedCurationCandidate> =
        assignments.mapNotNull { assignment ->
            val videoDetail = videoDetailsById[assignment.video.videoId] ?: return@mapNotNull null

            FeedCurationCandidate(
                keyword = assignment.keyword,
                video = assignment.video,
                videoDetail = videoDetail,
                searchOrder = assignment.searchOrder,
            )
        }

    private fun buildVideoKeywords(
        assignments: List<SearchVideoAssignment>,
        videoDetailsById: Map<String, YoutubeVideoDetail>,
    ): List<CollectedVideoKeyword> =
        assignments
            .distinctBy { it.video.videoId to it.keyword.word }
            .filter { videoDetailsById.containsKey(it.video.videoId) }
            .map { assignment ->
                CollectedVideoKeyword(
                    keywordWord = assignment.keyword.word,
                    youtubeVideoId = assignment.video.videoId,
                    relationType = TrendVideoKeywordRelationType.RELATED,
                    displayOrder = assignment.searchOrder,
                    score = assignment.keyword.trendScore.toIntScore(),
                    source = SOURCE,
                )
            }

    private fun Long.toIntScore(): Int = min(this, Int.MAX_VALUE.toLong()).toInt()

    private data class SearchVideoAssignment(
        val keyword: ScoredTrendKeyword,
        val video: YoutubeSearchVideo,
        val searchOrder: Int,
    )

    companion object {
        private const val SOURCE = "YOUTUBE_SEARCH"
        private val EMPTY_BATCH =
            CollectedKeywordVideoBatch(
                videos = emptyList(),
                feedItems = emptyList(),
                videoKeywords = emptyList(),
            )
    }
}
