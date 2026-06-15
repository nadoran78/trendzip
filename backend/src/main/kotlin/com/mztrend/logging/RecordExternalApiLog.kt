package com.mztrend.logging

import com.mztrend.domain.ExternalApiDirection
import com.mztrend.domain.ExternalApiProvider
import com.mztrend.domain.ExternalApiPurpose

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class RecordExternalApiLog(
    val provider: ExternalApiProvider,
    val purpose: ExternalApiPurpose,
    val method: String,
    val endpoint: String,
    val direction: ExternalApiDirection = ExternalApiDirection.OUTBOUND,
    val requestMetadata: String = "",
    val responseMetadata: String = "",
)
