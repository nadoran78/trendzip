package com.mztrend.service.crawling

import com.mztrend.service.crawling.candidate.ScoredTrendKeyword

fun ScoredTrendKeyword.toCollectedKeyword(): CollectedKeyword =
    CollectedKeyword(
        word = word,
        currentRank = rank,
        trendScore = trendScore,
    )
