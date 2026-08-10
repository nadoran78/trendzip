from fastapi import FastAPI

from app.api.feed import router as feed_router
from app.api.health import router as health_router
from app.exception_handlers import register_exception_handlers

app = FastAPI(title="Trendzip FastAPI Experiment")
register_exception_handlers(app)
app.include_router(health_router)
app.include_router(feed_router)
