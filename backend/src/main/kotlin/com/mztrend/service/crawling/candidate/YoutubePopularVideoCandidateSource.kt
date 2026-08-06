package com.mztrend.service.crawling.candidate

import com.mztrend.client.YoutubeApiClient
import com.mztrend.client.dto.YoutubeVideoDetail
import com.mztrend.common.logger
import com.mztrend.config.ExternalApiProperties
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime
import kotlin.math.roundToLong

@Component
class YoutubePopularVideoCandidateSource(
    private val youtubeApiClient: YoutubeApiClient,
    private val keywordCandidateExtractor: KeywordCandidateExtractor,
    private val fallbackCandidateExtractor: YoutubeVideoCandidateExtractor,
    private val candidatePostProcessor: TrendCandidatePostProcessor,
    private val properties: ExternalApiProperties,
    private val clock: Clock,
) : TrendCandidateSource {
    override fun collectCandidates(): List<TrendCandidate> {
        val popularVideos = youtubeApiClient.getPopularVideos(properties.youtube.popularVideoMaxResults)
        val collectedAt = LocalDateTime.now(clock)
        val extractionResult = keywordCandidateExtractor.extract(popularVideos.toExtractionRequest(collectedAt))
        val extractedCandidates = extractionResult.toTrendCandidates(popularVideos, collectedAt)
        val processedExtractedCandidates =
            candidatePostProcessor
                .process(extractedCandidates)
                .take(properties.gemini.candidateExtractionMaxCandidates)

        if (processedExtractedCandidates.size >= properties.gemini.candidateExtractionMinResultCount) return processedExtractedCandidates

        log.warn(
            "Fallback to token-based YouTube candidate extraction because Gemini returned too few keyword candidates. " +
                "candidateCount={}, processedCandidateCount={}, minResultCount={}",
            extractedCandidates.size,
            processedExtractedCandidates.size,
            properties.gemini.candidateExtractionMinResultCount,
        )
        val fallbackCandidates =
            fallbackCandidateExtractor.extract(
                videos = popularVideos,
                collectedAt = collectedAt,
                limit = properties.gemini.candidateExtractionMaxCandidates,
            )

        return candidatePostProcessor
            .process(
                mergeCandidates(
                    primaryCandidates = processedExtractedCandidates,
                    fallbackCandidates = fallbackCandidates,
                ),
            ).take(properties.gemini.candidateExtractionMaxCandidates)
    }

    private fun mergeCandidates(
        primaryCandidates: List<TrendCandidate>,
        fallbackCandidates: List<TrendCandidate>,
    ): List<TrendCandidate> {
        val primaryWords = primaryCandidates.map { it.word.lowercase() }.toSet()
        val supplementalCandidates =
            fallbackCandidates
                .filterNot { it.word.lowercase() in primaryWords }
                .distinctBy { it.word.lowercase() }
        return (primaryCandidates + supplementalCandidates).mapIndexed { index, candidate ->
            candidate.copy(rank = index + 1)
        }
    }

    private fun List<YoutubeVideoDetail>.toExtractionRequest(collectedAt: LocalDateTime): KeywordCandidateExtractionRequest =
        KeywordCandidateExtractionRequest(
            videos =
                take(properties.gemini.candidateExtractionMaxPromptVideos)
                    .map { video ->
                        KeywordCandidateExtractionVideo(
                            videoId = video.videoId,
                            title = video.title,
                            channelName = video.channelName,
                            tags = video.tags.take(MAX_TAG_COUNT),
                            description = video.description?.take(properties.gemini.candidateExtractionMaxDescriptionLength),
                            viewCount = video.viewCount,
                            publishedAt = video.publishedAt,
                        )
                    },
            collectedAt = collectedAt,
        )

    private fun KeywordCandidateExtractionResult.toTrendCandidates(
        popularVideos: List<YoutubeVideoDetail>,
        collectedAt: LocalDateTime,
    ): List<TrendCandidate> {
        val videosById = popularVideos.associateBy { it.videoId }
        val candidates =
            candidates.mapNotNull { candidate ->
                val evidenceVideos =
                    candidate.evidenceVideoIds
                        .mapNotNull(videosById::get)
                        .distinctBy { it.videoId }
                        .filter { video ->
                            KeywordEvidenceMatcher.isMentionedIn(
                                keyword = candidate.keyword,
                                texts = listOf(video.title, video.channelName, video.description.orEmpty()) + video.tags,
                            )
                        }
                if (evidenceVideos.isEmpty()) return@mapNotNull null

                val evidenceCount = evidenceVideos.size
                CandidateContext(
                    candidate = candidate,
                    evidenceCount = evidenceCount,
                    totalViewCount = evidenceVideos.sumOf { it.viewCount ?: 0L },
                    score = candidate.toScore(evidenceCount, evidenceVideos),
                )
            }

        val sortedCandidates =
            candidates.sortedWith(
                compareByDescending<CandidateContext> { it.score }
                    .thenByDescending { it.candidate.confidence }
                    .thenByDescending { it.totalViewCount }
                    .thenBy { it.candidate.keyword },
            )

        return sortedCandidates
            .take(properties.gemini.candidateExtractionMaxCandidates)
            .mapIndexed { index, context ->
                TrendCandidate(
                    word = context.candidate.keyword,
                    category = context.candidate.category,
                    source = TrendCandidateSourceType.YOUTUBE_POPULAR,
                    rank = index + 1,
                    score = context.score,
                    evidenceCount = context.evidenceCount,
                    totalViewCount = context.totalViewCount,
                    collectedAt = collectedAt,
                    evidenceVideos = evidenceVideos(context.candidate.evidenceVideoIds, popularVideos),
                )
            }
    }

    private fun evidenceVideos(
        evidenceVideoIds: List<String>,
        popularVideos: List<YoutubeVideoDetail>,
    ): List<TrendCandidateEvidenceVideo> {
        val videosById = popularVideos.associateBy { it.videoId }

        return evidenceVideoIds
            .mapNotNull(videosById::get)
            .distinctBy { it.videoId }
            .map { video -> video.toEvidenceVideo() }
    }

    private fun YoutubeVideoDetail.toEvidenceVideo(): TrendCandidateEvidenceVideo =
        TrendCandidateEvidenceVideo(
            videoId = videoId,
            title = title,
            channelName = channelName,
            tags = tags,
            description = description?.take(properties.gemini.candidateExtractionMaxDescriptionLength),
            viewCount = viewCount,
        )

    private fun ExtractedKeywordCandidate.toScore(
        evidenceCount: Int,
        evidenceVideos: List<YoutubeVideoDetail>,
    ): Long {
        val confidenceScore = (confidence * CONFIDENCE_SCORE_UNIT).roundToLong()
        val evidenceScore = evidenceCount * EVIDENCE_SCORE_UNIT
        val viewScore = evidenceVideos.sumOf { it.viewCount ?: 0L } / VIEW_SCORE_UNIT

        return confidenceScore + evidenceScore + viewScore
    }

    private data class CandidateContext(
        val candidate: ExtractedKeywordCandidate,
        val evidenceCount: Int,
        val totalViewCount: Long,
        val score: Long,
    )

    companion object {
        private const val MAX_TAG_COUNT = 10
        private const val CONFIDENCE_SCORE_UNIT = 100_000L
        private const val EVIDENCE_SCORE_UNIT = 1_000L
        private const val VIEW_SCORE_UNIT = 100_000L
        private val log = logger<YoutubePopularVideoCandidateSource>()
    }
}
