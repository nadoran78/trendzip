package com.mztrend.repository.query.dto

import com.mztrend.domain.Generation

data class KeywordExplainQueryResult(
    val id: Long,
    val word: String,
    val generation: Generation,
    val explain: String?,
)
