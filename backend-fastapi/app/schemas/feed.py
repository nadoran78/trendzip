from datetime import datetime

from app.domain.enums import FeedSection, Generation
from app.schemas.base import ApiModel


class FeedVideoResponse(ApiModel):
    video_id: str
    keyword_id: int
    title: str
    channel_name: str
    thumbnail_url: str | None
    view_count: int | None
    keyword: str
    feed_section: FeedSection | None
    badge: str | None
    published_at: datetime | None
    duration_seconds: int | None


class FeedResponse(ApiModel):
    generation: Generation
    videos: list[FeedVideoResponse]
