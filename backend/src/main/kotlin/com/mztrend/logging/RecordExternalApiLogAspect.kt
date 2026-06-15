package com.mztrend.logging

import com.mztrend.client.GeminiApiException
import com.mztrend.client.NaverDataLabException
import com.mztrend.client.YoutubeApiException
import com.mztrend.common.logger
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.reflect.MethodSignature
import org.springframework.beans.factory.BeanFactory
import org.springframework.context.expression.BeanFactoryResolver
import org.springframework.core.DefaultParameterNameDiscoverer
import org.springframework.expression.spel.standard.SpelExpressionParser
import org.springframework.expression.spel.support.StandardEvaluationContext
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDateTime
import kotlin.system.measureTimeMillis

@Aspect
@Component
class RecordExternalApiLogAspect(
    private val recorder: ExternalApiLogRecorder,
    private val clock: Clock,
    private val beanFactory: BeanFactory,
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
                    requestMetadata =
                        evaluateMetadataExpression(
                            expression = annotation.requestMetadata,
                            joinPoint = joinPoint,
                            result = result,
                            failure = failure,
                        ),
                    responseMetadata =
                        failure?.responseMetadata()
                            ?: if (failure == null) {
                                evaluateMetadataExpression(
                                    expression = annotation.responseMetadata,
                                    joinPoint = joinPoint,
                                    result = result,
                                    failure = failure,
                                )
                            } else {
                                null
                            },
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

    private fun evaluateMetadataExpression(
        expression: String,
        joinPoint: ProceedingJoinPoint,
        result: Any?,
        failure: Throwable?,
    ): Map<String, Any?>? {
        if (expression.isBlank()) return null

        val context =
            StandardEvaluationContext().apply {
                setBeanResolver(BeanFactoryResolver(beanFactory))
                setVariable("args", joinPoint.args)
                setVariable("result", result)
                setVariable("exception", failure)
            }
        joinPoint.args.forEachIndexed { index, arg ->
            context.setVariable("p$index", arg)
            context.setVariable("a$index", arg)
        }
        joinPoint.methodParameterNames()?.forEachIndexed { index, name ->
            context.setVariable(name, joinPoint.args.getOrNull(index))
        }

        return parser
            .parseExpression(expression)
            .getValue(context)
            .toMetadataMap()
    }

    private fun ProceedingJoinPoint.methodParameterNames(): Array<String>? {
        val method = (signature as? MethodSignature)?.method ?: return null
        return parameterNameDiscoverer.getParameterNames(method)
    }

    private fun Any?.toMetadataMap(): Map<String, Any?>? =
        when (this) {
            null -> null
            is Map<*, *> ->
                entries
                    .associate { (key, value) -> key.toString() to value }
                    .takeIf { it.isNotEmpty() }
            else -> throw IllegalArgumentException("External API log metadata expression must return Map.")
        }

    private fun Throwable.httpStatus(): Int? =
        when (this) {
            is GeminiApiException -> httpStatus
            is YoutubeApiException -> httpStatus
            is NaverDataLabException -> httpStatus
            else -> null
        }

    private fun Throwable.responseBody(): String? =
        when (this) {
            is GeminiApiException -> responseBody
            is YoutubeApiException -> responseBody
            is NaverDataLabException -> responseBody
            else -> null
        }

    private fun Throwable.responseMetadata(): Map<String, Any?>? =
        when (this) {
            is GeminiApiException -> responseMetadata
            is YoutubeApiException -> responseMetadata
            is NaverDataLabException -> responseMetadata
            else -> null
        }

    companion object {
        private const val SUCCESS_STATUS = 200
        private val log = logger<RecordExternalApiLogAspect>()
        private val parser = SpelExpressionParser()
        private val parameterNameDiscoverer = DefaultParameterNameDiscoverer()
    }
}
