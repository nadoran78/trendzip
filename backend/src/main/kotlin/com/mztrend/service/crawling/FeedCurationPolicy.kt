package com.mztrend.service.crawling

import java.time.LocalDateTime

interface FeedCurationPolicy {
    fun curate(
        candidates: List<FeedCurationCandidate>,
        collectedAt: LocalDateTime,
    ): List<CollectedFeedItem>
}
