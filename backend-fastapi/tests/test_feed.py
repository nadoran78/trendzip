from collections.abc import Iterator, Mapping, Sequence
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.domain.enums import FeedSection, Generation
from app.main import app
from app.repositories.feed import FeedVideoRecord
from app.services.feed import FeedService, get_feed_service


class InMemoryFeedRepository:
    def __init__(
        self,
        records_by_generation: Mapping[Generation, Sequence[FeedVideoRecord]],
    ) -> None:
        self._records_by_generation = {
            generation: tuple(records) for generation, records in records_by_generation.items()
        }

    def find_by_generation(self, generation: Generation) -> Sequence[FeedVideoRecord]:
        return self._records_by_generation.get(generation, ())


def get_fixture_feed_service() -> FeedService:
    return FeedService(
        repository=InMemoryFeedRepository(
            records_by_generation={
                Generation.TEEN: (
                    FeedVideoRecord(
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
                    FeedVideoRecord(
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
                    FeedVideoRecord(
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
                    FeedVideoRecord(
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
            }
        )
    )


@pytest.fixture(autouse=True)
def override_feed_service() -> Iterator[None]:
    app.dependency_overrides[get_feed_service] = get_fixture_feed_service
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_feed_service, None)


def test_feed_returns_teen_fixture_in_display_order() -> None:
    with TestClient(app) as client:
        response = client.get("/api/feed", params={"generation": "TEEN"})

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "generation": "TEEN",
            "videos": [
                {
                    "videoId": "teen-today-1",
                    "keywordId": 1,
                    "title": "10대 오늘의 영상",
                    "channelName": "트렌드 채널",
                    "thumbnailUrl": "https://example.com/teen-today-1.jpg",
                    "viewCount": 1_200_000,
                    "keyword": "teen-first",
                    "feedSection": "TODAY_PICK",
                    "badge": "HOT",
                    "publishedAt": "2026-06-15T15:05:34",
                    "durationSeconds": 180,
                },
                {
                    "videoId": "teen-rising-1",
                    "keywordId": 2,
                    "title": "10대 급상승 영상",
                    "channelName": "라이징 채널",
                    "thumbnailUrl": None,
                    "viewCount": None,
                    "keyword": "teen-second",
                    "feedSection": "RISING",
                    "badge": None,
                    "publishedAt": None,
                    "durationSeconds": None,
                },
            ],
        },
        "error": None,
    }


def test_feed_returns_twenty_fixture_in_display_order() -> None:
    with TestClient(app) as client:
        response = client.get("/api/feed", params={"generation": "TWENTY"})

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {
            "generation": "TWENTY",
            "videos": [
                {
                    "videoId": "twenty-today-1",
                    "keywordId": 3,
                    "title": "20대 오늘의 영상",
                    "channelName": "트렌드 채널",
                    "thumbnailUrl": "https://example.com/twenty-today-1.jpg",
                    "viewCount": 2_500_000,
                    "keyword": "twenty-first",
                    "feedSection": "TODAY_PICK",
                    "badge": "HOT",
                    "publishedAt": "2026-06-15T15:05:34",
                    "durationSeconds": 240,
                },
                {
                    "videoId": "twenty-related-1",
                    "keywordId": 4,
                    "title": "20대 관련 영상",
                    "channelName": "관련 채널",
                    "thumbnailUrl": None,
                    "viewCount": None,
                    "keyword": "twenty-second",
                    "feedSection": "RELATED",
                    "badge": None,
                    "publishedAt": None,
                    "durationSeconds": None,
                },
            ],
        },
        "error": None,
    }


def test_feed_dependency_can_be_overridden_with_empty_service() -> None:
    def get_empty_feed_service() -> FeedService:
        return FeedService(repository=InMemoryFeedRepository(records_by_generation={}))

    app.dependency_overrides[get_feed_service] = get_empty_feed_service
    try:
        with TestClient(app) as client:
            response = client.get("/api/feed", params={"generation": "TWENTY"})
    finally:
        app.dependency_overrides.pop(get_feed_service, None)

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"generation": Generation.TWENTY.value, "videos": []},
        "error": None,
    }


def test_feed_returns_kotlin_error_contract_for_invalid_generation() -> None:
    with TestClient(app) as client:
        response = client.get("/api/feed", params={"generation": "INVALID"})

    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "data": None,
        "error": {
            "code": "INVALID_REQUEST",
            "message": "Invalid request.",
        },
    }


def test_feed_returns_kotlin_error_contract_for_missing_generation() -> None:
    with TestClient(app) as client:
        response = client.get("/api/feed")

    assert response.status_code == 400
    assert response.json() == {
        "success": False,
        "data": None,
        "error": {
            "code": "INVALID_REQUEST",
            "message": "Invalid request.",
        },
    }


def test_feed_is_documented_in_openapi() -> None:
    with TestClient(app) as client:
        response = client.get("/openapi.json")

    assert response.status_code == 200
    openapi = response.json()
    feed_operation = openapi["paths"]["/api/feed"]["get"]
    generation_parameter = feed_operation["parameters"][0]

    assert feed_operation["tags"] == ["Feed"]
    assert feed_operation["summary"] == "세대별 피드 조회"
    assert generation_parameter["name"] == "generation"
    assert generation_parameter["required"] is True
    assert "400" in feed_operation["responses"]
    assert openapi["components"]["schemas"]["Generation"]["enum"] == ["TEEN", "TWENTY"]
