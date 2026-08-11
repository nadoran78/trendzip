from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, cast

from sqlalchemy import Connection, Select, case, select
from sqlalchemy.engine import RowMapping

from app.database.tables import keywords, trend_feed_items, trend_videos
from app.domain.enums import FeedSection, Generation

type FeedSelect = Select[
    tuple[
        str,
        int,
        str,
        str,
        str | None,
        int | None,
        str,
        str | None,
        str | None,
        datetime | None,
        int | None,
    ]
]


@dataclass(frozen=True)
class FeedVideoRecord:
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


class FeedRepository(Protocol):
    def find_by_generation(self, generation: Generation) -> Sequence[FeedVideoRecord]: ...


class SqlAlchemyFeedRepository:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection

    def find_by_generation(self, generation: Generation) -> Sequence[FeedVideoRecord]:
        rows = self._connection.execute(build_feed_statement(generation)).mappings()
        return [_to_feed_video_record(row) for row in rows]


def build_feed_statement(generation: Generation) -> FeedSelect:
    section_order = case(
        (trend_feed_items.c.feed_section == FeedSection.TODAY_PICK.value, 1),
        (trend_feed_items.c.feed_section == FeedSection.RISING.value, 2),
        (trend_feed_items.c.feed_section == FeedSection.RELATED.value, 3),
        else_=99,
    )

    statement = (
        select(
            trend_videos.c.youtube_video_id.label("video_id"),
            keywords.c.id.label("keyword_id"),
            trend_videos.c.title,
            trend_videos.c.channel_name,
            trend_videos.c.thumbnail_url,
            trend_videos.c.view_count,
            keywords.c.word.label("keyword"),
            trend_feed_items.c.feed_section,
            trend_feed_items.c.badge,
            trend_videos.c.published_at,
            trend_videos.c.duration_seconds,
        )
        .select_from(
            trend_feed_items.join(
                trend_videos,
                trend_videos.c.id == trend_feed_items.c.trend_video_id,
            ).join(
                keywords,
                keywords.c.id == trend_feed_items.c.primary_keyword_id,
            )
        )
        .where(
            trend_feed_items.c.generation == generation.value,
            keywords.c.generation == generation.value,
            trend_feed_items.c.is_active.is_(True),
        )
        .order_by(
            section_order.asc(),
            trend_feed_items.c.display_order.asc(),
            trend_feed_items.c.score.desc().nulls_last(),
            trend_videos.c.view_count.desc().nulls_last(),
            trend_feed_items.c.id.desc(),
        )
    )

    return statement


def _to_feed_video_record(row: RowMapping) -> FeedVideoRecord:
    feed_section = cast(str | None, row["feed_section"])
    return FeedVideoRecord(
        video_id=cast(str, row["video_id"]),
        keyword_id=cast(int, row["keyword_id"]),
        title=cast(str, row["title"]),
        channel_name=cast(str, row["channel_name"]),
        thumbnail_url=cast(str | None, row["thumbnail_url"]),
        view_count=cast(int | None, row["view_count"]),
        keyword=cast(str, row["keyword"]),
        feed_section=FeedSection(feed_section) if feed_section is not None else None,
        badge=cast(str | None, row["badge"]),
        published_at=cast(datetime | None, row["published_at"]),
        duration_seconds=cast(int | None, row["duration_seconds"]),
    )
