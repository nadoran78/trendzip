package com.mztrend.repository.command

import com.mztrend.domain.TrendVideo
import org.springframework.data.jpa.repository.JpaRepository

interface TrendVideoRepository : JpaRepository<TrendVideo, Long> {
    fun findByYoutubeVideoId(youtubeVideoId: String): TrendVideo?
}
