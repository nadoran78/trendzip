from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_kotlin_compatible_contract() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"status": "UP"},
        "error": None,
    }


def test_health_is_documented_in_openapi() -> None:
    with TestClient(app) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    health_operation = response.json()["paths"]["/api/health"]["get"]
    assert health_operation["tags"] == ["Health"]
    assert health_operation["summary"] == "헬스 체크"
