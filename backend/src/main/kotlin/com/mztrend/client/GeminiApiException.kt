package com.mztrend.client

class GeminiApiException(
    message: String,
    val httpStatus: Int? = null,
    val responseBody: String? = null,
    val responseMetadata: Map<String, Any?>? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
