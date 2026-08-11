import pytest

from app.database.config import DatabaseSettings
from app.database.connection import create_database_engine


def test_database_settings_convert_kotlin_jdbc_url_to_sqlalchemy_url() -> None:
    settings = DatabaseSettings(
        url="jdbc:postgresql://localhost:5432/mztrend",
        username="mztrend",
        password="mztrend",
    )

    database_url = settings.to_sqlalchemy_url()

    assert database_url.drivername == "postgresql+psycopg"
    assert database_url.host == "localhost"
    assert database_url.port == 5432
    assert database_url.database == "mztrend"
    assert database_url.username == "mztrend"
    assert database_url.password == "mztrend"


def test_test_database_settings_use_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "TEST_POSTGRES_URL",
        "jdbc:postgresql://test-postgres:5433/custom_test",
    )
    monkeypatch.setenv("TEST_POSTGRES_USERNAME", "test-user")
    monkeypatch.setenv("TEST_POSTGRES_PASSWORD", "test-password")

    settings = DatabaseSettings.from_environment(test=True)

    assert settings.url == "jdbc:postgresql://test-postgres:5433/custom_test"
    assert settings.username == "test-user"
    assert settings.password == "test-password"


def test_database_settings_reject_non_postgresql_driver() -> None:
    settings = DatabaseSettings(
        url="mysql://localhost:3306/mztrend",
        username="mztrend",
        password="mztrend",
    )

    with pytest.raises(ValueError, match="Unsupported PostgreSQL URL driver"):
        settings.to_sqlalchemy_url()


def test_create_database_engine_does_not_connect_eagerly() -> None:
    settings = DatabaseSettings(
        url="jdbc:postgresql://unreachable.invalid:5432/mztrend",
        username="mztrend",
        password="mztrend",
    )

    engine = create_database_engine(settings)
    try:
        assert engine.url.drivername == "postgresql+psycopg"
        assert engine.url.host == "unreachable.invalid"
    finally:
        engine.dispose()
