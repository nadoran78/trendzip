package com.mztrend.client

import com.mztrend.client.dto.NaverSearchTrendRequest
import com.mztrend.client.dto.NaverSearchTrendResponse

interface NaverDataLabTrendClient {
    fun searchTrend(request: NaverSearchTrendRequest): NaverSearchTrendResponse
}
