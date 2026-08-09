from app.schemas.health import HealthResponse
from app.schemas.response import ResponseWrapper


def test_success_response_wrapper_serializes_kotlin_contract() -> None:
    response = ResponseWrapper[HealthResponse].success_response(HealthResponse(status="UP"))

    assert response.model_dump() == {
        "success": True,
        "data": {"status": "UP"},
        "error": None,
    }
