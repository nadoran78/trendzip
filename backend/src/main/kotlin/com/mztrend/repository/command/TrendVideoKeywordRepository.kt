package com.mztrend.repository.command

import com.mztrend.domain.TrendVideoKeyword
import org.springframework.data.jpa.repository.JpaRepository

interface TrendVideoKeywordRepository : JpaRepository<TrendVideoKeyword, Long> {
    fun findByTrendVideoIdAndKeywordId(
        trendVideoId: Long,
        keywordId: Long,
    ): TrendVideoKeyword?
}
