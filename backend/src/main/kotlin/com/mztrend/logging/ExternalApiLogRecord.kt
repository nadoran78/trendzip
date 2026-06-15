package com.mztrend.logging

import com.mztrend.domain.ExternalApiDirection
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose
import java.time.LocalDateTime

data class ExternalApiLogRecord(
    val direction: ExternalApiDirection,
    val provider: ExternalApiProvider,
    val purpose: ExternalApiPurpose,
    val method: String,
    val endpoint: String,
    val httpStatus: Int?,
    val success: Boolean,
    val durationMs: Long,
    val requestBodySource: Any?,
    val responseBodySource: Any?,
    val requestMetadata: Map<String, Any?>? = null,
    val responseMetadata: Map<String, Any?>? = null,
    val errorMessage: String?,
    val startedAt: LocalDateTime,
    val endedAt: LocalDateTime,
)
