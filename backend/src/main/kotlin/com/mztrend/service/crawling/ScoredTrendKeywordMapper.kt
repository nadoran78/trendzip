package com.mztrend.service.crawling

import com.mztrend.service.crawling.candidate.ScoredTrendKeyword

fun ScoredTrendKeyword.toCollectedKeyword(): CollectedKeyword =
    CollectedKeyword(
        word = word,
        currentRank = rank,
        trendScore = trendScore,
        evidenceVideos =
            evidenceVideos.map { evidenceVideo ->
                CollectedKeywordEvidenceVideo(
                    youtubeVideoId = evidenceVideo.videoId,
                    title = evidenceVideo.title,
                    channelName = evidenceVideo.channelName,
                    description = evidenceVideo.description,
                    viewCount = evidenceVideo.viewCount,
                )
            },
    )
