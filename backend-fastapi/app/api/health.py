from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.schemas.response import ResponseWrapper

router = APIRouter(prefix="/api", tags=["Health"])


@router.get(
    "/health",
    response_model=ResponseWrapper[HealthResponse],
    summary="헬스 체크",
    description="백엔드 애플리케이션이 응답 가능한 상태인지 확인합니다.",
)
def health() -> ResponseWrapper[HealthResponse]:
    return ResponseWrapper[HealthResponse].success_response(HealthResponse(status="UP"))
