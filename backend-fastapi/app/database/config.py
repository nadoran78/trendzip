import os
from dataclasses import dataclass, field

from sqlalchemy.engine import URL, make_url

DEFAULT_POSTGRES_URL = "jdbc:postgresql://localhost:5432/mztrend"
DEFAULT_TEST_POSTGRES_URL = "jdbc:postgresql://localhost:5432/mztrend_test"
DEFAULT_POSTGRES_USERNAME = "mztrend"
DEFAULT_POSTGRES_PASSWORD = "mztrend"


@dataclass(frozen=True)
class DatabaseSettings:
    url: str
    username: str
    password: str = field(repr=False)

    @classmethod
    def from_environment(cls, *, test: bool = False) -> "DatabaseSettings":
        prefix = "TEST_" if test else ""
        default_url = DEFAULT_TEST_POSTGRES_URL if test else DEFAULT_POSTGRES_URL

        return cls(
            url=os.environ.get(f"{prefix}POSTGRES_URL", default_url),
            username=os.environ.get(
                f"{prefix}POSTGRES_USERNAME",
                DEFAULT_POSTGRES_USERNAME,
            ),
            password=os.environ.get(
                f"{prefix}POSTGRES_PASSWORD",
                DEFAULT_POSTGRES_PASSWORD,
            ),
        )

    def to_sqlalchemy_url(self) -> URL:
        database_url = make_url(self.url.removeprefix("jdbc:"))
        if database_url.drivername not in {"postgresql", "postgresql+psycopg"}:
            message = f"Unsupported PostgreSQL URL driver: {database_url.drivername}"
            raise ValueError(message)

        return database_url.set(
            drivername="postgresql+psycopg",
            username=self.username,
            password=self.password,
        )
