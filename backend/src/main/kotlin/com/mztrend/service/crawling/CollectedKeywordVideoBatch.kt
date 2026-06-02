package com.mztrend.service.crawling

data class CollectedKeywordVideoBatch(
    val videos: List<CollectedVideo>,
    val feedItems: List<CollectedFeedItem>,
    val videoKeywords: List<CollectedVideoKeyword>,
)
