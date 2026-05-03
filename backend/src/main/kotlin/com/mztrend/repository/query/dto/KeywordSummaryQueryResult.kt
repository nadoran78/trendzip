package com.mztrend.repository.query.dto

data class KeywordSummaryQueryResult(
    val id: Long,
    val word: String,
    val rank: Int?,
    val category: String?,
)
