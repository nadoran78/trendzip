package com.mztrend.repository.query.dto

import java.time.LocalDate

data class TrendGraphPointQueryResult(
    val period: LocalDate,
    val ratio: Long?,
)
