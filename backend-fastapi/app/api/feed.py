from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.domain.enums import Generation
from app.schemas.feed import FeedResponse
from app.schemas.response import ResponseWrapper
from app.services.feed import FeedService, get_feed_service

router = APIRouter(prefix="/api/feed", tags=["Feed"])


@router.get(
    "",
    response_model=ResponseWrapper[FeedResponse],
    summary="세대별 피드 조회",
    description="선택한 세대의 트렌드 키워드와 연결된 대표 유튜브 영상을 조회합니다.",
)
def get_feed(
    generation: Annotated[
        Generation,
        Query(
            description="조회할 세대. TEEN은 10대, TWENTY는 20대입니다.",
            examples=["TEEN"],
        ),
    ],
    feed_service: Annotated[FeedService, Depends(get_feed_service)],
) -> ResponseWrapper[FeedResponse]:
    return ResponseWrapper[FeedResponse].success_response(feed_service.get_feed(generation))
