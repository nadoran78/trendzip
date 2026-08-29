package com.mztrend.config

import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class MediaOperationsApiInterceptorTest {
    @Test
    fun `preHandle rejects request when operations API is disabled`() {
        val interceptor = MediaOperationsApiInterceptor(MediaOperationsProperties())

        val exception =
            assertFailsWith<MzTrendException> {
                interceptor.preHandle(MockHttpServletRequest(), MockHttpServletResponse(), Any())
            }

        assertEquals(ErrorCode.MEDIA_OPERATIONS_DISABLED, exception.errorCode)
    }

    @Test
    fun `preHandle rejects invalid API key`() {
        val interceptor = MediaOperationsApiInterceptor(MediaOperationsProperties(apiKey = "expected-key"))

        val exception =
            assertFailsWith<MzTrendException> {
                interceptor.preHandle(MockHttpServletRequest(), MockHttpServletResponse(), Any())
            }

        assertEquals(ErrorCode.UNAUTHORIZED, exception.errorCode)
    }

    @Test
    fun `preHandle accepts matching API key`() {
        val interceptor = MediaOperationsApiInterceptor(MediaOperationsProperties(apiKey = "expected-key"))
        val request =
            MockHttpServletRequest().apply {
                addHeader(MediaOperationsApiInterceptor.API_KEY_HEADER, "expected-key")
            }

        assertTrue(interceptor.preHandle(request, MockHttpServletResponse(), Any()))
    }
}
