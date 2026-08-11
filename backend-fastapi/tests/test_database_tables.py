from app.database.tables import keywords, metadata, trend_feed_items, trend_videos


def test_feed_tables_match_flyway_table_and_column_names() -> None:
    assert set(metadata.tables) == {"keywords", "trend_feed_items", "trend_videos"}
    assert set(keywords.c.keys()) == {"id", "word", "generation"}
    assert set(trend_videos.c.keys()) == {
        "id",
        "youtube_video_id",
        "title",
        "channel_name",
        "thumbnail_url",
        "view_count",
        "published_at",
        "duration_seconds",
    }
    assert set(trend_feed_items.c.keys()) == {
        "id",
        "generation",
        "trend_video_id",
        "primary_keyword_id",
        "feed_section",
        "display_order",
        "score",
        "badge",
        "is_active",
    }
