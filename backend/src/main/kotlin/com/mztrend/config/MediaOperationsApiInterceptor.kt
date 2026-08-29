package com.mztrend.config

import com.mztrend.exception.ErrorCode
import com.mztrend.exception.MzTrendException
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.servlet.HandlerInterceptor
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

@Component
class MediaOperationsApiInterceptor(
    private val properties: MediaOperationsProperties,
) : HandlerInterceptor {
    override fun preHandle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        handler: Any,
    ): Boolean {
        if (properties.apiKey.isBlank()) {
            throw MzTrendException(ErrorCode.MEDIA_OPERATIONS_DISABLED)
        }

        val providedApiKey = request.getHeader(API_KEY_HEADER)
        if (providedApiKey == null || !providedApiKey.constantTimeEquals(properties.apiKey)) {
            throw MzTrendException(ErrorCode.UNAUTHORIZED)
        }

        return true
    }

    private fun String.constantTimeEquals(expected: String): Boolean =
        MessageDigest.isEqual(
            toByteArray(StandardCharsets.UTF_8),
            expected.toByteArray(StandardCharsets.UTF_8),
        )

    companion object {
        const val API_KEY_HEADER = "X-Media-Operations-Key"
    }
}
