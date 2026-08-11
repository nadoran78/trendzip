from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Integer,
    MetaData,
    String,
    Table,
)

metadata = MetaData()

keywords = Table(
    "keywords",
    metadata,
    Column("id", BigInteger, primary_key=True),
    Column("word", String(100), nullable=False),
    Column("generation", String(10), nullable=False),
)

trend_videos = Table(
    "trend_videos",
    metadata,
    Column("id", BigInteger, primary_key=True),
    Column("youtube_video_id", String(50), nullable=False),
    Column("title", String(300), nullable=False),
    Column("channel_name", String(150), nullable=False),
    Column("thumbnail_url", String(500)),
    Column("view_count", BigInteger),
    Column("published_at", DateTime),
    Column("duration_seconds", Integer),
)

trend_feed_items = Table(
    "trend_feed_items",
    metadata,
    Column("id", BigInteger, primary_key=True),
    Column("generation", String(10), nullable=False),
    Column("trend_video_id", BigInteger, nullable=False),
    Column("primary_keyword_id", BigInteger, nullable=False),
    Column("feed_section", String(30)),
    Column("display_order", Integer, nullable=False),
    Column("score", Integer),
    Column("badge", String(30)),
    Column("is_active", Boolean, nullable=False),
)
