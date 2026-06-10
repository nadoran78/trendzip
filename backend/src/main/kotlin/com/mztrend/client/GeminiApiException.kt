package com.mztrend.client

class GeminiApiException(
    message: String,
    val httpStatus: Int? = null,
    val responseBody: String? = null,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
