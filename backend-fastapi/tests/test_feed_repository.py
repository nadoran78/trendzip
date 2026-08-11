from app.database.config import DatabaseSettings
from app.database.connection import create_database_engine
from app.domain.enums import Generation
from app.repositories.feed import build_feed_statement


def test_feed_statement_matches_kotlin_filters_and_ordering() -> None:
    statement = build_feed_statement(Generation.TEEN)
    engine = create_database_engine(
        DatabaseSettings(
            url="jdbc:postgresql://unreachable.invalid:5432/mztrend_test",
            username="mztrend",
            password="mztrend",
        )
    )
    try:
        compiled_statement = statement.compile(
            dialect=engine.dialect,
            compile_kwargs={"literal_binds": True},
        )
    finally:
        engine.dispose()
    sql = " ".join(str(compiled_statement).split())

    assert "trend_feed_items.generation = 'TEEN'" in sql
    assert "keywords.generation = 'TEEN'" in sql
    assert "trend_feed_items.is_active IS true" in sql
    assert "CASE" in sql
    assert "TODAY_PICK" in sql
    assert "RISING" in sql
    assert "RELATED" in sql
    assert "trend_feed_items.display_order ASC" in sql
    assert "trend_feed_items.score DESC NULLS LAST" in sql
    assert "trend_videos.view_count DESC NULLS LAST" in sql
    assert "trend_feed_items.id DESC" in sql
