package com.mztrend.service.crawling

import com.mztrend.client.dto.YoutubeSearchVideo
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.service.crawling.candidate.ScoredTrendKeyword

data class FeedCurationCandidate(
    val keyword: ScoredTrendKeyword,
    val video: YoutubeSearchVideo,
    val videoDetail: YoutubeVideoDetail,
    val searchOrder: Int,
)
