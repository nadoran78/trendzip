from collections.abc import Iterator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, delete, insert

from app.database.config import DatabaseSettings
from app.database.connection import create_database_engine, get_connection
from app.database.tables import keywords, trend_feed_items, trend_videos
from app.domain.enums import FeedSection, Generation
from app.main import app
from app.repositories.feed import FeedVideoRecord, SqlAlchemyFeedRepository

pytestmark = pytest.mark.postgres


@pytest.fixture
def feed_connection() -> Iterator[Connection]:
    settings = DatabaseSettings.from_environment(test=True)
    database_url = settings.to_sqlalchemy_url()
    if database_url.database != "mztrend_test":
        message = "PostgreSQL integration tests must use the mztrend_test database."
        raise RuntimeError(message)

    engine = create_database_engine(settings)
    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                _clear_feed_tables(connection)
                _insert_feed_rows(connection)
                yield connection
            finally:
                transaction.rollback()
    finally:
        engine.dispose()


def test_feed_endpoint_reads_postgres_through_default_dependencies(
    feed_connection: Connection,
) -> None:
    def override_connection() -> Iterator[Connection]:
        yield feed_connection

    app.dependency_overrides[get_connection] = override_connection
    try:
        with TestClient(app) as client:
            response = client.get("/api/feed", params={"generation": "TEEN"})
    finally:
        app.dependency_overrides.pop(get_connection, None)

    assert response.status_code == 200
    assert response.json()["data"]["generation"] == Generation.TEEN.value
    assert [video["videoId"] for video in response.json()["data"]["videos"]] == [
        "teen-today-1",
        "teen-today-2",
        "teen-rising-1",
        "teen-related-1",
    ]


def test_repository_reads_active_teen_feed_in_kotlin_display_order(
    feed_connection: Connection,
) -> None:
    repository = SqlAlchemyFeedRepository(feed_connection)

    records = list(repository.find_by_generation(Generation.TEEN))

    assert [record.video_id for record in records] == [
        "teen-today-1",
        "teen-today-2",
        "teen-rising-1",
        "teen-related-1",
    ]
    assert records[0] == FeedVideoRecord(
        video_id="teen-today-1",
        keyword_id=90_001,
        title="teen today first",
        channel_name="teen channel",
        thumbnail_url="https://img.example/teen-today-1.jpg",
        view_count=900_000,
        keyword="teen-first",
        feed_section=FeedSection.TODAY_PICK,
        badge="HOT",
        published_at=datetime(2026, 5, 20, 19, 0),
        duration_seconds=180,
    )
    assert records[-1].thumbnail_url is None
    assert records[-1].view_count is None
    assert records[-1].published_at is None
    assert records[-1].duration_seconds is None

    assert "teen-wrong-keyword-generation" not in [record.video_id for record in records]


def test_repository_filters_feed_by_twenty_generation(feed_connection: Connection) -> None:
    repository = SqlAlchemyFeedRepository(feed_connection)

    records = list(repository.find_by_generation(Generation.TWENTY))

    assert [record.video_id for record in records] == ["twenty-today-1"]
    assert records[0].keyword == "twenty-first"


def _clear_feed_tables(connection: Connection) -> None:
    connection.execute(delete(trend_feed_items))
    connection.execute(delete(trend_videos))
    connection.execute(delete(keywords))


def _insert_feed_rows(connection: Connection) -> None:
    connection.execute(
        insert(keywords),
        [
            {"id": 90_001, "word": "teen-first", "generation": Generation.TEEN.value},
            {"id": 90_002, "word": "teen-second", "generation": Generation.TEEN.value},
            {"id": 90_003, "word": "teen-inactive", "generation": Generation.TEEN.value},
            {"id": 90_004, "word": "twenty-first", "generation": Generation.TWENTY.value},
        ],
    )
    connection.execute(
        insert(trend_videos),
        [
            {
                "id": 91_001,
                "youtube_video_id": "teen-today-2",
                "title": "teen today second",
                "channel_name": "teen channel",
                "thumbnail_url": "https://img.example/teen-today-2.jpg",
                "view_count": 1_100_000,
                "published_at": datetime(2026, 5, 20, 18, 0),
                "duration_seconds": 210,
            },
            {
                "id": 91_002,
                "youtube_video_id": "teen-today-1",
                "title": "teen today first",
                "channel_name": "teen channel",
                "thumbnail_url": "https://img.example/teen-today-1.jpg",
                "view_count": 900_000,
                "published_at": datetime(2026, 5, 20, 19, 0),
                "duration_seconds": 180,
            },
            {
                "id": 91_003,
                "youtube_video_id": "teen-rising-1",
                "title": "teen rising",
                "channel_name": "teen channel",
                "thumbnail_url": "https://img.example/teen-rising-1.jpg",
                "view_count": 1_500_000,
                "published_at": datetime(2026, 5, 19, 20, 0),
                "duration_seconds": 240,
            },
            {
                "id": 91_004,
                "youtube_video_id": "teen-related-1",
                "title": "teen related",
                "channel_name": "teen channel",
                "thumbnail_url": None,
                "view_count": None,
                "published_at": None,
                "duration_seconds": None,
            },
            {
                "id": 91_005,
                "youtube_video_id": "twenty-today-1",
                "title": "twenty today",
                "channel_name": "twenty channel",
                "thumbnail_url": "https://img.example/twenty-today-1.jpg",
                "view_count": 800_000,
                "published_at": datetime(2026, 5, 20, 20, 0),
                "duration_seconds": 360,
            },
            {
                "id": 91_006,
                "youtube_video_id": "teen-inactive",
                "title": "teen inactive",
                "channel_name": "teen channel",
                "thumbnail_url": "https://img.example/teen-inactive.jpg",
                "view_count": 3_000_000,
                "published_at": datetime(2026, 5, 20, 22, 0),
                "duration_seconds": 400,
            },
            {
                "id": 91_007,
                "youtube_video_id": "teen-wrong-keyword-generation",
                "title": "teen wrong keyword generation",
                "channel_name": "teen channel",
                "thumbnail_url": "https://img.example/teen-wrong-keyword-generation.jpg",
                "view_count": 500_000,
                "published_at": datetime(2026, 5, 20, 21, 0),
                "duration_seconds": 300,
            },
        ],
    )
    connection.execute(
        insert(trend_feed_items),
        [
            {
                "id": 92_001,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_001,
                "primary_keyword_id": 90_002,
                "feed_section": FeedSection.TODAY_PICK.value,
                "display_order": 2,
                "score": 80,
                "badge": None,
                "is_active": True,
            },
            {
                "id": 92_002,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_002,
                "primary_keyword_id": 90_001,
                "feed_section": FeedSection.TODAY_PICK.value,
                "display_order": 1,
                "score": 95,
                "badge": "HOT",
                "is_active": True,
            },
            {
                "id": 92_003,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_003,
                "primary_keyword_id": 90_001,
                "feed_section": FeedSection.RISING.value,
                "display_order": 1,
                "score": 90,
                "badge": "RISING",
                "is_active": True,
            },
            {
                "id": 92_004,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_004,
                "primary_keyword_id": 90_001,
                "feed_section": FeedSection.RELATED.value,
                "display_order": 1,
                "score": 70,
                "badge": None,
                "is_active": True,
            },
            {
                "id": 92_005,
                "generation": Generation.TWENTY.value,
                "trend_video_id": 91_005,
                "primary_keyword_id": 90_004,
                "feed_section": FeedSection.TODAY_PICK.value,
                "display_order": 1,
                "score": 88,
                "badge": "HOT",
                "is_active": True,
            },
            {
                "id": 92_006,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_006,
                "primary_keyword_id": 90_003,
                "feed_section": FeedSection.TODAY_PICK.value,
                "display_order": 1,
                "score": 99,
                "badge": None,
                "is_active": False,
            },
            {
                "id": 92_007,
                "generation": Generation.TEEN.value,
                "trend_video_id": 91_007,
                "primary_keyword_id": 90_004,  # TWENTY keyword
                "feed_section": FeedSection.TODAY_PICK.value,
                "display_order": 1,
                "score": 85,
                "badge": None,
                "is_active": True,
            },
        ],
    )
