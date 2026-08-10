from typing import Self

from app.schemas.base import ApiModel


class ErrorResponse(ApiModel):
    code: str
    message: str


class ResponseWrapper[DataT](ApiModel):
    success: bool
    data: DataT | None = None
    error: ErrorResponse | None = None

    @classmethod
    def success_response(cls, data: DataT) -> Self:
        return cls(success=True, data=data, error=None)
