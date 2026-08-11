from typing import Annotated

from fastapi import Depends
from sqlalchemy import Connection

from app.database.connection import get_connection
from app.domain.enums import Generation
from app.repositories.feed import (
    FeedRepository,
    FeedVideoRecord,
    SqlAlchemyFeedRepository,
)
from app.schemas.feed import FeedResponse, FeedVideoResponse


class FeedService:
    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def get_feed(self, generation: Generation) -> FeedResponse:
        return FeedResponse(
            generation=generation,
            videos=[
                _to_feed_video_response(record)
                for record in self._repository.find_by_generation(generation)
            ],
        )


def get_feed_repository(
    connection: Annotated[Connection, Depends(get_connection)],
) -> FeedRepository:
    return SqlAlchemyFeedRepository(connection)


def get_feed_service(
    repository: Annotated[FeedRepository, Depends(get_feed_repository)],
) -> FeedService:
    return FeedService(repository)


def _to_feed_video_response(record: FeedVideoRecord) -> FeedVideoResponse:
    return FeedVideoResponse(
        video_id=record.video_id,
        keyword_id=record.keyword_id,
        title=record.title,
        channel_name=record.channel_name,
        thumbnail_url=record.thumbnail_url,
        view_count=record.view_count,
        keyword=record.keyword,
        feed_section=record.feed_section,
        badge=record.badge,
        published_at=record.published_at,
        duration_seconds=record.duration_seconds,
    )
