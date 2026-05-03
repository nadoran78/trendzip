package com.mztrend.exception

import com.mztrend.common.ResponseWrapper
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(MzTrendException::class)
    fun handleMzTrendException(exception: MzTrendException): ResponseEntity<ResponseWrapper<Unit>> =
        ResponseEntity
            .status(exception.errorCode.status)
            .body(ResponseWrapper.fail(exception.errorCode.name, exception.message))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(exception: MethodArgumentNotValidException): ResponseEntity<ResponseWrapper<Unit>> {
        val message =
            exception.bindingResult.fieldErrors
                .firstOrNull()
                ?.defaultMessage
                ?: ErrorCode.INVALID_REQUEST.defaultMessage

        return ResponseEntity
            .status(ErrorCode.INVALID_REQUEST.status)
            .body(ResponseWrapper.fail(ErrorCode.INVALID_REQUEST.name, message))
    }

    @ExceptionHandler(Exception::class)
    fun handleException(exception: Exception): ResponseEntity<ResponseWrapper<Unit>> =
        ResponseEntity
            .status(ErrorCode.INTERNAL_ERROR.status)
            .body(ResponseWrapper.fail(ErrorCode.INTERNAL_ERROR.name, ErrorCode.INTERNAL_ERROR.defaultMessage))
}
