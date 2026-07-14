package com.mztrend.common

data class ResponseWrapper<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ErrorResponse? = null,
) {
    companion object {
        fun <T> success(data: T): ResponseWrapper<T> = ResponseWrapper(success = true, data = data)

        fun fail(
            code: String,
            message: String,
        ): ResponseWrapper<Unit> = ResponseWrapper(success = false, error = ErrorResponse(code = code, message = message))
    }
}

data class ErrorResponse(
    val code: String,
    val message: String,
)
