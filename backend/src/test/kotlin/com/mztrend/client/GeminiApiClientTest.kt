package com.mztrend.client

import com.mztrend.client.dto.GeminiContent
import com.mztrend.client.dto.GeminiGenerateContentRequest
import com.mztrend.client.dto.GeminiGenerationConfig
import com.mztrend.client.dto.GeminiPart
import com.mztrend.config.ExternalApiProperties
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod.POST
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class GeminiApiClientTest {
    private lateinit var server: MockRestServiceServer
    private lateinit var client: GeminiApiClient

    @BeforeEach
    fun setUp() {
        val restTemplate = RestTemplate()
        server = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build()
        client = GeminiApiClient(testProperties(), restTemplate)
    }

    @Test
    fun `generateText posts generateContent request with api key header`() {
        val expectedRequestBody =
            """
            {
              "contents": [
                {
                  "role": "user",
                  "parts": [
                    { "text": "아이브가 왜 뜨는지 설명해줘" }
                  ]
                }
              ],
              "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 512
              }
            }
            """.trimIndent()

        server
            .expect(requestTo(containsString("/models/gemini-test:generateContent")))
            .andExpect(method(POST))
            .andExpect(header("x-goog-api-key", TEST_API_KEY))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(content().json(expectedRequestBody))
            .andRespond(withSuccess(generateContentResponse(), MediaType.APPLICATION_JSON))

        val text =
            client.generateText(
                GeminiGenerateContentRequest(
                    contents =
                        listOf(
                            GeminiContent(
                                role = "user",
                                parts = listOf(GeminiPart("아이브가 왜 뜨는지 설명해줘")),
                            ),
                        ),
                    generationConfig =
                        GeminiGenerationConfig(
                            temperature = 0.3,
                            maxOutputTokens = 512,
                        ),
                ),
            )

        assertEquals("아이브는 숏폼과 음악 콘텐츠에서 반복 노출되며 관심을 받고 있습니다.", text)
        server.verify()
    }

    @Test
    fun `client throws clear exception when api key is missing`() {
        val clientWithoutApiKey =
            GeminiApiClient(
                testProperties(apiKey = ""),
                RestTemplate(),
            )

        val exception =
            assertFailsWith<GeminiApiException> {
                clientWithoutApiKey.generateText(validRequest())
            }

        assertEquals("Gemini API key is not configured.", exception.message)
    }

    @Test
    fun `client throws clear exception when gemini returns error`() {
        server
            .expect(requestTo(containsString("/models/gemini-test:generateContent")))
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS))

        val exception =
            assertFailsWith<GeminiApiException> {
                client.generateText(validRequest())
            }

        assertEquals("Gemini API request failed. status=429", exception.message)
        server.verify()
    }

    @Test
    fun `client throws clear exception when response has no text`() {
        server
            .expect(requestTo(containsString("/models/gemini-test:generateContent")))
            .andRespond(withSuccess("""{ "candidates": [] }""", MediaType.APPLICATION_JSON))

        val exception =
            assertFailsWith<GeminiApiException> {
                client.generateText(validRequest())
            }

        assertEquals("Gemini API response did not contain text.", exception.message)
        server.verify()
    }

    @Test
    fun `client throws clear exception when response finish reason is not stop`() {
        server
            .expect(requestTo(containsString("/models/gemini-test:generateContent")))
            .andRespond(
                withSuccess(
                    """
                    {
                      "candidates": [
                        {
                          "content": {
                            "parts": [
                              { "text": "잘린 설명입니다" }
                            ]
                          },
                          "finishReason": "MAX_TOKENS"
                        }
                      ]
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON,
                ),
            )

        val exception =
            assertFailsWith<GeminiApiException> {
                client.generateText(validRequest())
            }

        assertEquals("Gemini API response was not completed. finishReason=MAX_TOKENS", exception.message)
        assertEquals(200, exception.httpStatus)
        assertEquals("""{"finishReason":"MAX_TOKENS","text":"잘린 설명입니다"}""", exception.responseBody)
        server.verify()
    }

    private fun validRequest(): GeminiGenerateContentRequest =
        GeminiGenerateContentRequest(
            contents = listOf(GeminiContent(role = "user", parts = listOf(GeminiPart("프롬프트")))),
        )

    private fun testProperties(apiKey: String = TEST_API_KEY): ExternalApiProperties =
        ExternalApiProperties(
            gemini =
                ExternalApiProperties.Gemini(
                    baseUrl = "https://generativelanguage.googleapis.com/v1beta",
                    apiKey = apiKey,
                    model = "gemini-test",
                ),
        )

    private fun generateContentResponse(): String =
        """
        {
          "candidates": [
            {
              "content": {
                "parts": [
                  {
                    "text": "아이브는 숏폼과 음악 콘텐츠에서 반복 노출되며 관심을 받고 있습니다."
                  }
                ],
                "role": "model"
              },
              "finishReason": "STOP"
            }
          ]
        }
        """.trimIndent()

    companion object {
        private const val TEST_API_KEY = "test-gemini-api-key"
    }
}
