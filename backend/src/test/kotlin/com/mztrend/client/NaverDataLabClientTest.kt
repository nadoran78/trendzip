package com.mztrend.client

import com.mztrend.client.dto.NaverKeywordGroup
import com.mztrend.client.dto.NaverSearchTrendRequest
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

class NaverDataLabClientTest {
    private lateinit var server: MockRestServiceServer
    private lateinit var client: NaverDataLabClient

    @BeforeEach
    fun setUp() {
        val restTemplate = RestTemplate()
        server = MockRestServiceServer.bindTo(restTemplate).ignoreExpectOrder(true).build()
        client = NaverDataLabClient(testProperties(), restTemplate)
    }

    @Test
    fun `searchTrend posts request with naver auth headers`() {
        val expectedRequestBody =
            """
            {
              "startDate": "2026-05-03",
              "endDate": "2026-06-01",
              "timeUnit": "date",
              "keywordGroups": [
                { "groupName": "아이브", "keywords": ["아이브"] }
              ],
              "device": "mo",
              "ages": ["2"]
            }
            """.trimIndent()

        server
            .expect(requestTo(containsString("/search")))
            .andExpect(method(POST))
            .andExpect(header("X-Naver-Client-Id", TEST_CLIENT_ID))
            .andExpect(header("X-Naver-Client-Secret", TEST_CLIENT_SECRET))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(content().json(expectedRequestBody))
            .andRespond(withSuccess(searchTrendResponse(), MediaType.APPLICATION_JSON))

        val response =
            client.searchTrend(
                NaverSearchTrendRequest(
                    startDate = "2026-05-03",
                    endDate = "2026-06-01",
                    timeUnit = "date",
                    keywordGroups = listOf(NaverKeywordGroup("아이브", listOf("아이브"))),
                    device = "mo",
                    ages = listOf("2"),
                ),
            )

        assertEquals("2026-05-03", response.startDate)
        assertEquals("2026-06-01", response.endDate)
        assertEquals("date", response.timeUnit)
        assertEquals(1, response.results.size)
        assertEquals("아이브", response.results[0].title)
        assertEquals(100.0, response.results[0].data[1].ratio)
        server.verify()
    }

    @Test
    fun `client throws clear exception when credentials are missing`() {
        val clientWithoutCredentials =
            NaverDataLabClient(
                testProperties(clientId = "", clientSecret = ""),
                RestTemplate(),
            )

        val exception =
            assertFailsWith<NaverDataLabException> {
                clientWithoutCredentials.searchTrend(validRequest())
            }

        assertEquals("Naver DataLab client id is not configured.", exception.message)
    }

    @Test
    fun `client throws clear exception when naver returns error`() {
        server
            .expect(requestTo(containsString("/search")))
            .andRespond(withStatus(HttpStatus.FORBIDDEN))

        val exception =
            assertFailsWith<NaverDataLabException> {
                client.searchTrend(validRequest())
            }

        assertEquals("Naver DataLab API request failed. status=403", exception.message)
        server.verify()
    }

    @Test
    fun `client rejects too many keyword groups`() {
        val request =
            validRequest(
                keywordGroups =
                    listOf(
                        NaverKeywordGroup("키워드1", listOf("키워드1")),
                        NaverKeywordGroup("키워드2", listOf("키워드2")),
                        NaverKeywordGroup("키워드3", listOf("키워드3")),
                        NaverKeywordGroup("키워드4", listOf("키워드4")),
                        NaverKeywordGroup("키워드5", listOf("키워드5")),
                        NaverKeywordGroup("키워드6", listOf("키워드6")),
                    ),
            )

        val exception =
            assertFailsWith<IllegalArgumentException> {
                client.searchTrend(request)
            }

        assertEquals("Naver DataLab keywordGroups must not exceed 5.", exception.message)
    }

    private fun validRequest(
        keywordGroups: List<NaverKeywordGroup> = listOf(NaverKeywordGroup("아이브", listOf("아이브"))),
    ): NaverSearchTrendRequest =
        NaverSearchTrendRequest(
            startDate = "2026-05-03",
            endDate = "2026-06-01",
            timeUnit = "date",
            keywordGroups = keywordGroups,
            device = "mo",
            ages = listOf("2"),
        )

    private fun testProperties(
        clientId: String = TEST_CLIENT_ID,
        clientSecret: String = TEST_CLIENT_SECRET,
    ): ExternalApiProperties =
        ExternalApiProperties(
            naver =
                ExternalApiProperties.Naver(
                    baseUrl = "https://openapi.naver.com/v1/datalab",
                    clientId = clientId,
                    clientSecret = clientSecret,
                ),
        )

    private fun searchTrendResponse(): String =
        """
        {
          "startDate": "2026-05-03",
          "endDate": "2026-06-01",
          "timeUnit": "date",
          "results": [
            {
              "title": "아이브",
              "keywords": ["아이브"],
              "data": [
                { "period": "2026-05-31", "ratio": 80.0 },
                { "period": "2026-06-01", "ratio": 100.0 }
              ]
            }
          ]
        }
        """.trimIndent()

    companion object {
        private const val TEST_CLIENT_ID = "test-naver-client-id"
        private const val TEST_CLIENT_SECRET = "test-naver-client-secret"
    }
}
