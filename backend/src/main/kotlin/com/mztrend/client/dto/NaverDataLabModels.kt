package com.mztrend.client.dto

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class NaverSearchTrendRequest(
    val startDate: String,
    val endDate: String,
    val timeUnit: String,
    val keywordGroups: List<NaverKeywordGroup>,
    val device: String? = null,
    val ages: List<String>? = null,
    val gender: String? = null,
)

data class NaverKeywordGroup(
    val groupName: String,
    val keywords: List<String>,
)

data class NaverSearchTrendResponse(
    val startDate: String? = null,
    val endDate: String? = null,
    val timeUnit: String? = null,
    val results: List<NaverSearchTrendResult> = emptyList(),
)

data class NaverSearchTrendResult(
    val title: String? = null,
    val keywords: List<String> = emptyList(),
    val data: List<NaverSearchTrendDataPoint> = emptyList(),
)

data class NaverSearchTrendDataPoint(
    val period: String? = null,
    val ratio: Double = 0.0,
)
