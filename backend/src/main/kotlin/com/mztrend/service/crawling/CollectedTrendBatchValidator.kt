package com.mztrend.service.crawling

import org.springframework.stereotype.Component

@Component
class CollectedTrendBatchValidator {
    fun validate(batch: CollectedTrendBatch) {
        validateFeedItems(batch)
        validateReferences(batch)
    }

    private fun validateFeedItems(batch: CollectedTrendBatch) {
        val duplicatedYoutubeVideoIds =
            batch.feedItems
                .groupingBy { it.youtubeVideoId }
                .eachCount()
                .filterValues { it > 1 }
                .keys
                .sorted()

        require(duplicatedYoutubeVideoIds.isEmpty()) {
            "Collected feed items must contain one representative item per YouTube video. " +
                "generation=${batch.generation}, duplicatedYoutubeVideoIds=$duplicatedYoutubeVideoIds"
        }
    }

    private fun validateReferences(batch: CollectedTrendBatch) {
        val keywordWords = batch.keywords.map { it.word }.toSet()
        val youtubeVideoIds = batch.videos.map { it.youtubeVideoId }.toSet()

        requireReferences(
            type = "feedItems.keywordWord",
            generation = batch.generation.name,
            values = batch.feedItems.map { it.keywordWord },
            allowedValues = keywordWords,
        )
        requireReferences(
            type = "feedItems.youtubeVideoId",
            generation = batch.generation.name,
            values = batch.feedItems.map { it.youtubeVideoId },
            allowedValues = youtubeVideoIds,
        )
        requireReferences(
            type = "videoKeywords.keywordWord",
            generation = batch.generation.name,
            values = batch.videoKeywords.map { it.keywordWord },
            allowedValues = keywordWords,
        )
        requireReferences(
            type = "videoKeywords.youtubeVideoId",
            generation = batch.generation.name,
            values = batch.videoKeywords.map { it.youtubeVideoId },
            allowedValues = youtubeVideoIds,
        )
        requireReferences(
            type = "keywordRelations.keywordWord",
            generation = batch.generation.name,
            values = batch.keywordRelations.map { it.keywordWord },
            allowedValues = keywordWords,
        )
        requireReferences(
            type = "keywordRelations.relatedKeywordWord",
            generation = batch.generation.name,
            values = batch.keywordRelations.map { it.relatedKeywordWord },
            allowedValues = keywordWords,
        )
    }

    private fun requireReferences(
        type: String,
        generation: String,
        values: List<String>,
        allowedValues: Set<String>,
    ) {
        val unknownValues =
            values
                .filterNot(allowedValues::contains)
                .distinct()
                .sorted()

        require(unknownValues.isEmpty()) {
            "Collected trend batch contains unknown references. " +
                "generation=$generation, type=$type, unknownValues=$unknownValues"
        }
    }
}
