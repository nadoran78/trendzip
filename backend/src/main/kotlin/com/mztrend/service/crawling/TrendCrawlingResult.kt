package com.mztrend.service.crawling

data class TrendCrawlingResult(
    val keywordCount: Int,
    val trendLogCount: Int,
    val videoCount: Int,
    val keywordVideoMappingCount: Int,
    val keywordRelationCount: Int,
)
