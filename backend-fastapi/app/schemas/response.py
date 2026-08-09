from typing import Self

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str


class ResponseWrapper[DataT](BaseModel):
    success: bool
    data: DataT | None = None
    error: ErrorResponse | None = None

    @classmethod
    def success_response(cls, data: DataT) -> Self:
        return cls(success=True, data=data, error=None)
