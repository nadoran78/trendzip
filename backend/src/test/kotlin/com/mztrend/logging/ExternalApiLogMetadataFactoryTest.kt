package com.mztrend.logging

import com.mztrend.client.GeminiGenerateContentResult
import com.mztrend.client.dto.GeminiContent
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerationConfig
import com.mztrend.client.dto.GeminiPart
import com.mztrend.client.dto.GeminiThinkingConfig
import com.mztrend.client.dto.GeminiUsageMetadata
import com.mztrend.config.ExternalApiProperties
import com.mztrend.domain.Generation
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class ExternalApiLogMetadataFactoryTest {
    @Test
    fun `gemini request metadata includes configured model and request generation config`() {
        val factory =
            ExternalApiLogMetadataFactory(
                ExternalApiProperties(
                    gemini = ExternalApiProperties.Gemini(model = "gemini-test"),
                ),
            )

        val metadata =
            factory.geminiRequest(
                GeminiGenerateContentRequest(
                    contents =
                        listOf(
                            GeminiContent(
                                role = "user",
                                parts = listOf(GeminiPart("첫 번째 프롬프트"), GeminiPart("두 번째 프롬프트")),
                            ),
                        ),
                    generationConfig =
                        GeminiGenerationConfig(
                            temperature = 0.4,
                            maxOutputTokens = 1024,
                            thinkingConfig = GeminiThinkingConfig(thinkingLevel = "MINIMAL"),
                        ),
                ),
            )

        assertEquals("gemini-test", metadata["model"])
        assertEquals(1, metadata["contentCount"])
        assertEquals(2, metadata["partCount"])
        assertEquals(18, metadata["promptTextLength"])
        assertEquals(0.4, metadata["temperature"])
        assertEquals(1024, metadata["maxOutputTokens"])
        assertEquals("MINIMAL", metadata["thinkingLevel"])
    }

    @Test
    fun `gemini response metadata includes usage metadata`() {
        val factory = ExternalApiLogMetadataFactory(ExternalApiProperties())

        val metadata =
            factory.geminiResponse(
                GeminiGenerateContentResult(
                    text = "설명",
                    finishReason = "STOP",
                    usageMetadata =
                        GeminiUsageMetadata(
                            promptTokenCount = 10,
                            candidatesTokenCount = 20,
                            thoughtsTokenCount = 30,
                            totalTokenCount = 60,
                        ),
                ),
            )

        assertEquals("STOP", metadata["finishReason"])
        assertEquals(
            mapOf(
                "promptTokenCount" to 10,
                "candidatesTokenCount" to 20,
                "thoughtsTokenCount" to 30,
                "totalTokenCount" to 60,
            ),
            metadata["usageMetadata"],
        )
    }

    @Test
    fun `youtube search request metadata includes configured search filters`() {
        val factory =
            ExternalApiLogMetadataFactory(
                ExternalApiProperties(
                    youtube =
                        ExternalApiProperties.Youtube(
                            regionCode = "KR",
                            relevanceLanguage = "ko",
                            safeSearch = "moderate",
                        ),
                ),
            )

        val metadata =
            factory.youtubeSearchRequest(
                keyword = " 메이플스토리 ",
                generation = Generation.TEEN,
                maxResults = 5,
            )

        assertEquals("메이플스토리", metadata["keyword"])
        assertEquals("TEEN", metadata["generation"])
        assertEquals(5, metadata["maxResults"])
        assertEquals("KR", metadata["regionCode"])
        assertEquals("ko", metadata["relevanceLanguage"])
        assertEquals("moderate", metadata["safeSearch"])
    }

    @Test
    fun `youtube popular request metadata includes configured popular video filters`() {
        val factory =
            ExternalApiLogMetadataFactory(
                ExternalApiProperties(
                    youtube =
                        ExternalApiProperties.Youtube(
                            regionCode = "KR",
                            popularVideoCategoryId = "10",
                        ),
                ),
            )

        val metadata = factory.youtubePopularRequest(maxResults = 50)

        assertEquals("mostPopular", metadata["chart"])
        assertEquals(50, metadata["maxResults"])
        assertEquals("KR", metadata["regionCode"])
        assertEquals("10", metadata["videoCategoryId"])
    }

    @Test
    fun `youtube popular request metadata omits blank optional category`() {
        val factory =
            ExternalApiLogMetadataFactory(
                ExternalApiProperties(
                    youtube = ExternalApiProperties.Youtube(popularVideoCategoryId = ""),
                ),
            )

        val metadata = factory.youtubePopularRequest(maxResults = 50)

        assertFalse("videoCategoryId" in metadata)
    }
}
