package com.mztrend.client

class NaverDataLabException(
    message: String,
    val httpStatus: Int? = null,
    val responseBody: String? = null,
    val responseMetadata: Map<String, Any?>? = null,
) : RuntimeException(message)
