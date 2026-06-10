package com.mztrend.logging

import com.mztrend.client.GeminiApiException
import com.mztrend.common.logger
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime
import kotlin.system.measureTimeMillis

@Aspect
@Component
class RecordExternalApiLogAspect(
    private val recorder: ExternalApiLogRecorder,
    private val clock: Clock,
) {
    @Around("@annotation(recordExternalApiLog)")
    fun record(
        joinPoint: ProceedingJoinPoint,
        recordExternalApiLog: RecordExternalApiLog,
    ): Any? {
        val startedAt = LocalDateTime.now(clock)
        var result: Any? = null
        var failure: Throwable? = null
        val durationMs =
            measureTimeMillis {
                try {
                    result = joinPoint.proceed()
                } catch (exception: Throwable) {
                    failure = exception
                }
            }
        val endedAt = LocalDateTime.now(clock)

        saveLog(
            joinPoint = joinPoint,
            annotation = recordExternalApiLog,
            result = result,
            failure = failure,
            durationMs = durationMs,
            startedAt = startedAt,
            endedAt = endedAt,
        )

        failure?.let { throw it }
        return result
    }

    private fun saveLog(
        joinPoint: ProceedingJoinPoint,
        annotation: RecordExternalApiLog,
        result: Any?,
        failure: Throwable?,
        durationMs: Long,
        startedAt: LocalDateTime,
        endedAt: LocalDateTime,
    ) {
        runCatching {
            recorder.record(
                ExternalApiLogRecord(
                    direction = annotation.direction,
                    provider = annotation.provider,
                    purpose = annotation.purpose,
                    method = annotation.method,
                    endpoint = annotation.endpoint,
                    httpStatus = failure?.httpStatus() ?: if (failure == null) SUCCESS_STATUS else null,
                    success = failure == null,
                    durationMs = durationMs,
                    requestBodySource = joinPoint.args,
                    responseBodySource = result ?: failure?.responseBody(),
                    errorMessage = failure?.message,
                    startedAt = startedAt,
                    endedAt = endedAt,
                ),
            )
        }.onFailure { logException ->
            log.warn(
                "Failed to record external API log. provider={}, purpose={}, message={}",
                annotation.provider,
                annotation.purpose,
                logException.message,
            )
        }
    }

    private fun Throwable.httpStatus(): Int? =
        when (this) {
            is GeminiApiException -> httpStatus
            else -> null
        }

    private fun Throwable.responseBody(): String? =
        when (this) {
            is GeminiApiException -> responseBody
            else -> null
        }

    companion object {
        private const val SUCCESS_STATUS = 200
        private val log = logger<RecordExternalApiLogAspect>()
    }
}
