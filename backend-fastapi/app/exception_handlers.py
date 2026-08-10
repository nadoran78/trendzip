from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.schemas.response import ResponseWrapper

INVALID_REQUEST_CODE = "INVALID_REQUEST"
INVALID_REQUEST_MESSAGE = "Invalid request."


async def request_validation_exception_handler(
    _request: Request,
    _exception: Exception,
) -> JSONResponse:
    response = ResponseWrapper[None].failure_response(
        code=INVALID_REQUEST_CODE,
        message=INVALID_REQUEST_MESSAGE,
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=response.model_dump(mode="json"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
