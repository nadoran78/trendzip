# Trendzip FastAPI Experiment

기존 Kotlin/Spring Boot 백엔드의 API 계약을 FastAPI로 작은 단위씩 재구현하며 Python과 FastAPI를 학습하는 실험 디렉터리입니다.

이 구현은 아직 운영 백엔드가 아닙니다. 운영 동작과 PostgreSQL migration의 기준은 각각 `backend/`의 Kotlin 코드와 Flyway migration입니다.

## 현재 단계

`EXP-001`에서 FastAPI 기본 구조, 공통 응답 model, `GET /api/health`와 pytest API 테스트를 구현했습니다. Kotlin과 호환되는 health API에 공통 성공 응답 classmethod를 적용했고 Swagger UI에서 응답 계약을 확인했습니다.

현재 구조:

```text
backend-fastapi/
├── .python-version
├── pyproject.toml
├── uv.lock
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   └── health.py
│   └── schemas/
│       ├── health.py
│       └── response.py
└── tests/
    ├── test_app.py
    ├── test_health.py
    └── test_response.py
```

health API는 고정된 상태를 반환하므로 service와 repository 계층을 두지 않습니다.

## 개발 환경

- Python 3.12
- uv
- FastAPI와 Uvicorn
- Ruff formatter·linter
- mypy type checker
- pytest와 FastAPI TestClient

uv가 없다면 [공식 설치 안내](https://docs.astral.sh/uv/getting-started/installation/)에 따라 먼저 설치합니다. 프로젝트의 `.python-version`과 `uv.lock`을 기준으로 Python과 의존성이 재현됩니다.

저장소 루트에서 다음 명령을 실행하면 잠긴 의존성을 동기화하고 모든 FastAPI 검증을 수행합니다.

```bash
./dev/verify-fastapi
```

서버는 검증 명령으로 `.venv`를 준비한 뒤 실행할 수 있습니다.

```bash
cd backend-fastapi
.venv/bin/uvicorn app.main:app --reload
```

- 애플리케이션: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

health API를 확인합니다.

```bash
curl http://127.0.0.1:8000/api/health
```

```json
{
  "success": true,
  "data": {
    "status": "UP"
  },
  "error": null
}
```

개별 검증 명령은 다음과 같습니다.

```bash
cd backend-fastapi
uv sync --locked
uv run --locked ruff format --check .
uv run --locked ruff check .
uv run --locked mypy app tests
uv run --locked python -m pytest
```

## 완료한 실습

### Application 설정과 OpenAPI

1. `app/main.py`의 `FastAPI()`에 `title="Trendzip FastAPI Experiment"`를 추가했습니다.
2. `tests/test_app.py`에서 OpenAPI JSON의 `info.title`이 같은 문자열인지 검증했습니다.
3. 저장소 루트에서 `./dev/verify-fastapi`를 실행해 검증했습니다.

이 실습은 Python keyword argument, JSON dictionary 접근, pytest `assert`와 FastAPI 설정이 OpenAPI 문서로 이어지는 방식을 익히기 위한 것입니다.

### 공통 성공 응답 factory

공통 응답의 직접 생성을 factory method로 리팩터링했습니다.

1. `app/schemas/response.py`의 `ResponseWrapper`에 `success_response` classmethod를 추가했습니다.
2. 반환 타입은 `Self`, 입력 `data`의 타입은 generic type parameter인 `DataT`를 사용했습니다.
3. `tests/test_response.py`와 `app/api/health.py`의 직접 생성을 새 factory method 호출로 변경했습니다.
4. `ResponseWrapper[HealthResponse]`로 타입 인자를 명시해 정적 타입과 Pydantic 런타임 타입을 일치시켰습니다.
5. `./dev/verify-fastapi`와 Swagger UI의 `Execute` 호출로 응답을 검증했습니다.

`success`는 이미 응답 field 이름이므로 Kotlin factory와 같은 이름 대신 `success_response`를 사용합니다. 이 실습은 Python `@classmethod`, `cls`, `Self`, generic type과 동작을 바꾸지 않는 리팩터링을 익히기 위한 것입니다.

## 관련 문서

- [FastAPI 전용 작업 규칙](AGENTS.md)
- [FastAPI 백엔드 실험 로드맵](../docs/experiments/fastapi-backend.md)
- [공통 비즈니스 흐름](../docs/business-flow.md)
- [현재 작업](../docs/work-items.md)
- [Kotlin 기준 구현 규칙](../backend/AGENTS.md)
