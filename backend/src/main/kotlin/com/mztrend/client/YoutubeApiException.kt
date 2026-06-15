package com.mztrend.client

import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException

class YoutubeApiException(
    message: String,
    val httpStatus: Int? = null,
    val responseBody: String? = null,
    val responseMetadata: Map<String, Any?>? = null,
) : MzTrendException(ErrorCode.EXTERNAL_API_ERROR, message)
