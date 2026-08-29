package com.mztrend.exception

import org.springframework.http.HttpStatus

enum class ErrorCode(
    val status: HttpStatus,
    val defaultMessage: String,
) {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "Invalid request."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Authentication is required."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found."),
    DUPLICATE_MEDIA_CONTENT(HttpStatus.CONFLICT, "Duplicate media content."),
    DUPLICATE_MEDIA_RENDER_ARTIFACT(HttpStatus.CONFLICT, "Duplicate media render artifact."),
    DUPLICATE_MEDIA_REVIEW_DECISION(HttpStatus.CONFLICT, "Duplicate media review decision."),
    STALE_MEDIA_RENDER_ARTIFACT(HttpStatus.CONFLICT, "The media render artifact is not current."),
    INVALID_STATE_TRANSITION(HttpStatus.CONFLICT, "Invalid state transition."),
    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "External API request failed."),
    MEDIA_OPERATIONS_DISABLED(HttpStatus.SERVICE_UNAVAILABLE, "Media operations API is disabled."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error."),
}
