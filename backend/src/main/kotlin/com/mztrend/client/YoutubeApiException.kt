package com.mztrend.client

import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException

class YoutubeApiException(
    message: String,
) : MzTrendException(ErrorCode.EXTERNAL_API_ERROR, message)
