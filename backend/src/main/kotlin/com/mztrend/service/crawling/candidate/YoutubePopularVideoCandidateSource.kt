package com.mztrend.service.crawling.candidate

import com.mztrend.client.YoutubeApiClient
import com.mztrend.config.ExternalApiProperties
import org.springframework.stereotype.Component

@Component
class YoutubePopularVideoCandidateSource(
    private val youtubeApiClient: YoutubeApiClient,
    private val candidateExtractor: YoutubeVideoCandidateExtractor,
    private val properties: ExternalApiProperties,
) : TrendCandidateSource {
    override fun collectCandidates(): List<TrendCandidate> {
        val popularVideos = youtubeApiClient.getPopularVideos(properties.youtube.popularVideoMaxResults)

        return candidateExtractor.extract(popularVideos)
    }
}
