from app.schemas.health import HealthResponse
from app.schemas.response import ResponseWrapper


def test_success_response_wrapper_serializes_kotlin_contract() -> None:
    response = ResponseWrapper[HealthResponse].success_response(HealthResponse(status="UP"))

    assert response.model_dump() == {
        "success": True,
        "data": {"status": "UP"},
        "error": None,
    }


def test_failure_response_wrapper_serializes_kotlin_contract() -> None:
    response = ResponseWrapper[None].failure_response(
        code="INVALID_REQUEST",
        message="Invalid request.",
    )

    assert response.model_dump() == {
        "success": False,
        "data": None,
        "error": {
            "code": "INVALID_REQUEST",
            "message": "Invalid request.",
        },
    }
