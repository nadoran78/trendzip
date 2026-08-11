from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
from typing import Annotated, cast

from fastapi import Depends, FastAPI, Request
from sqlalchemy import Connection, Engine, create_engine

from app.database.config import DatabaseSettings


def create_database_engine(settings: DatabaseSettings | None = None) -> Engine:
    database_settings = settings or DatabaseSettings.from_environment()
    return create_engine(
        database_settings.to_sqlalchemy_url(),
        pool_pre_ping=True,
    )


@asynccontextmanager
async def database_lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_database_engine()
    app.state.database_engine = engine
    try:
        yield
    finally:
        engine.dispose()


def get_database_engine(request: Request) -> Engine:
    return cast(Engine, request.app.state.database_engine)


def get_connection(
    engine: Annotated[Engine, Depends(get_database_engine)],
) -> Iterator[Connection]:
    with engine.connect() as connection:
        yield connection
