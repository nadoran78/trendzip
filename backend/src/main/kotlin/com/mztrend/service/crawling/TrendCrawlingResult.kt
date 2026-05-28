package com.mztrend.service.crawling

data class TrendCrawlingResult(
    val keywordCount: Int,
    val trendLogCount: Int,
    val videoCount: Int,
    val feedItemCount: Int,
    val videoKeywordCount: Int,
    val keywordRelationCount: Int,
)
