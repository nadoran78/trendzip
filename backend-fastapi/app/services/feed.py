from collections.abc import Mapping, Sequence
from datetime import datetime

from app.domain.enums import FeedSection, Generation
from app.schemas.feed import FeedResponse, FeedVideoResponse


class FeedService:
    def __init__(
        self,
        videos_by_generation: Mapping[Generation, Sequence[FeedVideoResponse]],
    ) -> None:
        self._videos_by_generation = {
            generation: tuple(videos) for generation, videos in videos_by_generation.items()
        }

    def get_feed(self, generation: Generation) -> FeedResponse:
        return FeedResponse(
            generation=generation,
            videos=list(self._videos_by_generation.get(generation, ())),
        )


def get_feed_service() -> FeedService:
    return FeedService(
        videos_by_generation={
            Generation.TEEN: (
                FeedVideoResponse(
                    video_id="teen-today-1",
                    keyword_id=1,
                    title="10대 오늘의 영상",
                    channel_name="트렌드 채널",
                    thumbnail_url="https://example.com/teen-today-1.jpg",
                    view_count=1_200_000,
                    keyword="teen-first",
                    feed_section=FeedSection.TODAY_PICK,
                    badge="HOT",
                    published_at=datetime(2026, 6, 15, 15, 5, 34),
                    duration_seconds=180,
                ),
                FeedVideoResponse(
                    video_id="teen-rising-1",
                    keyword_id=2,
                    title="10대 급상승 영상",
                    channel_name="라이징 채널",
                    thumbnail_url=None,
                    view_count=None,
                    keyword="teen-second",
                    feed_section=FeedSection.RISING,
                    badge=None,
                    published_at=None,
                    duration_seconds=None,
                ),
            ),
            Generation.TWENTY: (
                FeedVideoResponse(
                    video_id="twenty-today-1",
                    keyword_id=3,
                    title="20대 오늘의 영상",
                    channel_name="트렌드 채널",
                    thumbnail_url="https://example.com/twenty-today-1.jpg",
                    view_count=2_500_000,
                    keyword="twenty-first",
                    feed_section=FeedSection.TODAY_PICK,
                    badge="HOT",
                    published_at=datetime(2026, 6, 15, 15, 5, 34),
                    duration_seconds=240,
                ),
                FeedVideoResponse(
                    video_id="twenty-related-1",
                    keyword_id=4,
                    title="20대 관련 영상",
                    channel_name="관련 채널",
                    thumbnail_url=None,
                    view_count=None,
                    keyword="twenty-second",
                    feed_section=FeedSection.RELATED,
                    badge=None,
                    published_at=None,
                    duration_seconds=None,
                ),
            ),
        },
    )
