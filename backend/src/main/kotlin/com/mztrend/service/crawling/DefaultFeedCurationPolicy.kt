package com.mztrend.service.crawling

import com.mztrend.domain.FeedSection
import org.springframework.stereotype.Component
import java.time.LocalDateTime
import kotlin.math.min

@Component
class DefaultFeedCurationPolicy : FeedCurationPolicy {
    override fun curate(
        candidates: List<FeedCurationCandidate>,
        collectedAt: LocalDateTime,
    ): List<CollectedFeedItem> {
        val representativeCandidates = candidates.representativeCandidates()
        if (representativeCandidates.isEmpty()) return emptyList()

        val todayPick = representativeCandidates.first()
        val risingCandidates = representativeCandidates.drop(1).take(RISING_FEED_ITEM_SIZE)
        val relatedCandidates = representativeCandidates.drop(1 + RISING_FEED_ITEM_SIZE)

        return buildList {
            add(todayPick.toFeedItem(FeedSection.TODAY_PICK, displayOrder = 1, badge = "HOT", collectedAt = collectedAt))
            risingCandidates.forEachIndexed { index, candidate ->
                add(
                    candidate.toFeedItem(
                        feedSection = FeedSection.RISING,
                        displayOrder = index + 1,
                        badge = if (index < NEW_BADGE_SIZE) "NEW" else null,
                        collectedAt = collectedAt,
                    ),
                )
            }
            relatedCandidates.forEachIndexed { index, candidate ->
                add(
                    candidate.toFeedItem(
                        feedSection = FeedSection.RELATED,
                        displayOrder = index + 1,
                        badge = null,
                        collectedAt = collectedAt,
                    ),
                )
            }
        }
    }

    private fun List<FeedCurationCandidate>.representativeCandidates(): List<FeedCurationCandidate> {
        val candidateComparator =
            compareBy<FeedCurationCandidate> { it.keyword.rank }
                .thenBy { it.searchOrder }
                .thenByDescending { it.videoDetail.viewCount ?: 0L }
                .thenBy { it.video.videoId }

        return sortedWith(candidateComparator).distinctBy { it.video.videoId }
    }

    private fun FeedCurationCandidate.toFeedItem(
        feedSection: FeedSection,
        displayOrder: Int,
        badge: String?,
        collectedAt: LocalDateTime,
    ): CollectedFeedItem =
        CollectedFeedItem(
            keywordWord = keyword.word,
            youtubeVideoId = video.videoId,
            feedSection = feedSection,
            displayOrder = displayOrder,
            score = keyword.trendScore.toIntScore(),
            badge = badge,
            source = SOURCE,
            collectedAt = collectedAt,
        )

    private fun Long.toIntScore(): Int = min(this, Int.MAX_VALUE.toLong()).toInt()

    companion object {
        private const val SOURCE = "YOUTUBE_SEARCH"
        private const val RISING_FEED_ITEM_SIZE = 5
        private const val NEW_BADGE_SIZE = 2
    }
}
