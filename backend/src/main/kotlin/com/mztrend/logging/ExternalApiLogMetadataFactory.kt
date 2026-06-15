package com.mztrend.logging

import com.mztrend.client.GeminiGenerateContentResult
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.NaverSearchTrendRequest
import com.mztrend.client.dto.NaverSearchTrendResponse
import com.mztrend.client.dto.YoutubeChannelDetail
import com.mztrend.client.dto.YoutubeSearchVideo
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import org.springframework.stereotype.Component

@Component
class ExternalApiLogMetadataFactory(
    private val properties: ExternalApiProperties,
) {
    // Methods in this factory are invoked from @RecordExternalApiLog SpEL expressions.
    fun geminiRequest(request: GeminiGenerateContentRequest): Map<String, Any?> =
        linkedMapOf(
            "model" to properties.gemini.model,
            "contentCount" to request.contents.size,
            "partCount" to request.contents.sumOf { it.parts.size },
            "promptTextLength" to request.contents.sumOf { content -> content.parts.sumOf { it.text.length } },
            "temperature" to request.generationConfig?.temperature,
            "maxOutputTokens" to request.generationConfig?.maxOutputTokens,
            "thinkingLevel" to request.generationConfig?.thinkingConfig?.thinkingLevel,
        ).withoutNullValues()

    fun geminiResponse(result: GeminiGenerateContentResult): Map<String, Any?> =
        linkedMapOf(
            "finishReason" to result.finishReason,
            "usageMetadata" to result.usageMetadata?.toMetadata(),
        ).withoutNullValues()

    fun youtubeSearchRequest(
        keyword: String,
        generation: Generation,
        maxResults: Int,
    ): Map<String, Any?> =
        mapOf(
            "keyword" to keyword.trim(),
            "generation" to generation.name,
            "maxResults" to maxResults,
            "regionCode" to properties.youtube.regionCode,
            "relevanceLanguage" to properties.youtube.relevanceLanguage,
            "safeSearch" to properties.youtube.safeSearch,
        ).withoutBlankValues()

    fun youtubeSearchResponse(result: List<YoutubeSearchVideo>): Map<String, Any?> = mapOf("mappedVideoCount" to result.size)

    fun youtubePopularRequest(maxResults: Int): Map<String, Any?> =
        linkedMapOf(
            "chart" to "mostPopular",
            "maxResults" to maxResults,
            "regionCode" to properties.youtube.regionCode,
            "videoCategoryId" to properties.youtube.popularVideoCategoryId,
        ).withoutBlankValues()

    fun youtubeVideoDetailsRequest(videoIds: Collection<String>): Map<String, Any?> {
        val distinctVideoIds = videoIds.filter { it.isNotBlank() }.distinct()
        return mapOf(
            "requestedVideoIdCount" to videoIds.size,
            "distinctVideoIdCount" to distinctVideoIds.size,
            "chunkCount" to distinctVideoIds.chunked(YOUTUBE_MAX_ID_BATCH_SIZE).size,
        )
    }

    fun youtubeVideoDetailsResponse(result: List<YoutubeVideoDetail>): Map<String, Any?> = mapOf("mappedVideoCount" to result.size)

    fun youtubeChannelDetailsRequest(channelIds: Collection<String>): Map<String, Any?> {
        val distinctChannelIds = channelIds.filter { it.isNotBlank() }.distinct()
        return mapOf(
            "requestedChannelIdCount" to channelIds.size,
            "distinctChannelIdCount" to distinctChannelIds.size,
            "chunkCount" to distinctChannelIds.chunked(YOUTUBE_MAX_ID_BATCH_SIZE).size,
        )
    }

    fun youtubeChannelDetailsResponse(result: List<YoutubeChannelDetail>): Map<String, Any?> = mapOf("mappedChannelCount" to result.size)

    fun naverTrendRequest(request: NaverSearchTrendRequest): Map<String, Any?> =
        linkedMapOf(
            "startDate" to request.startDate,
            "endDate" to request.endDate,
            "timeUnit" to request.timeUnit,
            "device" to request.device,
            "ages" to request.ages,
            "keywordGroupCount" to request.keywordGroups.size,
            "keywordCount" to request.keywordGroups.sumOf { it.keywords.size },
        ).withoutNullValues()

    fun naverTrendResponse(result: NaverSearchTrendResponse): Map<String, Any?> =
        linkedMapOf(
            "startDate" to result.startDate,
            "endDate" to result.endDate,
            "timeUnit" to result.timeUnit,
            "resultGroupCount" to result.results.size,
            "dataPointCount" to result.results.sumOf { it.data.size },
        ).withoutNullValues()

    private fun Map<String, Any?>.withoutNullValues(): Map<String, Any?> = filterValues { it != null }

    private fun Map<String, Any?>.withoutBlankValues(): Map<String, Any?> =
        withoutNullValues().filterValues { it !is String || it.isNotBlank() }

    private fun com.mztrend.client.dto.GeminiUsageMetadata.toMetadata(): Map<String, Any?> =
        linkedMapOf(
            "promptTokenCount" to promptTokenCount,
            "cachedContentTokenCount" to cachedContentTokenCount,
            "candidatesTokenCount" to candidatesTokenCount,
            "thoughtsTokenCount" to thoughtsTokenCount,
            "totalTokenCount" to totalTokenCount,
        ).withoutNullValues()

    companion object {
        private const val YOUTUBE_MAX_ID_BATCH_SIZE = 50
    }
}
