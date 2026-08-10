from datetime import datetime

from app.domain.enums import FeedSection, Generation
from app.schemas.feed import FeedResponse, FeedVideoResponse


def test_feed_enums_match_kotlin_contract() -> None:
    assert [generation.value for generation in Generation] == ["TEEN", "TWENTY"]
    assert [section.value for section in FeedSection] == [
        "TODAY_PICK",
        "RISING",
        "RELATED",
    ]


def test_feed_response_serializes_camel_case_contract() -> None:
    video = FeedVideoResponse(
        video_id="teen-today-1",
        keyword_id=1,
        title="영상 제목",
        channel_name="채널명",
        thumbnail_url="https://example.com/thumbnail.jpg",
        view_count=1_200_000,
        keyword="키워드명",
        feed_section=FeedSection.TODAY_PICK,
        badge="HOT",
        published_at=datetime(2026, 6, 15, 15, 5, 34),
        duration_seconds=180,
    )

    response = FeedResponse(generation=Generation.TEEN, videos=[video])

    assert response.model_dump(mode="json") == {
        "generation": "TEEN",
        "videos": [
            {
                "videoId": "teen-today-1",
                "keywordId": 1,
                "title": "영상 제목",
                "channelName": "채널명",
                "thumbnailUrl": "https://example.com/thumbnail.jpg",
                "viewCount": 1_200_000,
                "keyword": "키워드명",
                "feedSection": "TODAY_PICK",
                "badge": "HOT",
                "publishedAt": "2026-06-15T15:05:34",
                "durationSeconds": 180,
            }
        ],
    }


def test_feed_video_response_preserves_nullable_fields() -> None:
    video = FeedVideoResponse(
        video_id="teen-related-1",
        keyword_id=2,
        title="관련 영상",
        channel_name="채널명",
        thumbnail_url=None,
        view_count=None,
        keyword="관련 키워드",
        feed_section=None,
        badge=None,
        published_at=None,
        duration_seconds=None,
    )

    assert video.model_dump(mode="json") == {
        "videoId": "teen-related-1",
        "keywordId": 2,
        "title": "관련 영상",
        "channelName": "채널명",
        "thumbnailUrl": None,
        "viewCount": None,
        "keyword": "관련 키워드",
        "feedSection": None,
        "badge": None,
        "publishedAt": None,
        "durationSeconds": None,
    }
