# Trendzip FastAPI Experiment

기존 Kotlin/Spring Boot 백엔드의 API 계약을 FastAPI로 작은 단위씩 재구현하며 Python과 FastAPI를 학습하는 실험 디렉터리입니다.

이 구현은 아직 운영 백엔드가 아닙니다. 운영 동작과 PostgreSQL migration의 기준은 각각 `backend/`의 Kotlin 코드와 Flyway migration입니다.

## 현재 단계

`EXP-001`에서 FastAPI 기본 구조와 health API를 완료했습니다. `EXP-002`에서는 Kotlin feed 응답을 Python enum과 Pydantic 중첩 model로 옮기고, fixture로 고정한 API 계약을 sync SQLAlchemy 읽기 repository와 PostgreSQL에 연결했습니다.

현재 구조:

```text
backend-fastapi/
├── .python-version
├── pyproject.toml
├── uv.lock
├── app/
│   ├── __init__.py
│   ├── exception_handlers.py
│   ├── main.py
│   ├── api/
│   │   ├── feed.py
│   │   └── health.py
│   ├── database/
│   │   ├── config.py
│   │   ├── connection.py
│   │   └── tables.py
│   ├── domain/
│   │   └── enums.py
│   ├── repositories/
│   │   └── feed.py
│   ├── schemas/
│   │   ├── base.py
│   │   ├── feed.py
│   │   ├── health.py
│   │   └── response.py
│   └── services/
│       └── feed.py
└── tests/
    ├── integration/
    │   └── test_feed_postgres.py
    ├── test_app.py
    ├── test_database_config.py
    ├── test_database_tables.py
    ├── test_feed.py
    ├── test_feed_repository.py
    ├── test_feed_schema.py
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
- SQLAlchemy 2.x Core와 psycopg 3

uv가 없다면 [공식 설치 안내](https://docs.astral.sh/uv/getting-started/installation/)에 따라 먼저 설치합니다. 프로젝트의 `.python-version`과 `uv.lock`을 기준으로 Python과 의존성이 재현됩니다.

저장소 루트에서 다음 명령을 실행하면 잠긴 의존성을 동기화하고 모든 FastAPI 검증을 수행합니다.

```bash
./dev/verify-fastapi
```

기본 명령은 PostgreSQL이 필요 없는 검사를 실행합니다. Kotlin Flyway schema를 적용한 `mztrend_test`에서 SQLAlchemy 조회까지 검증하려면 다음 명령을 실행합니다.

```bash
./dev/verify-fastapi --db
```

`--db`는 루트 Docker Compose의 PostgreSQL을 시작하고, Kotlin Flyway migration을 테스트 DB에 적용한 뒤 PostgreSQL marker가 지정된 통합 테스트를 실행합니다. 테스트 데이터는 각 테스트의 transaction에서 rollback됩니다.

서버는 검증 명령으로 `.venv`를 준비한 뒤 실행할 수 있습니다.

feed API를 호출하려면 먼저 로컬 PostgreSQL과 Flyway schema를 준비합니다.

```bash
docker compose -p trendzip up -d --wait postgres
cd backend
./gradlew flywayMigrate
cd ../backend-fastapi
```

```bash
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

PostgreSQL 접속은 기본적으로 `localhost:5432/mztrend`와 로컬 계정 `mztrend`를 사용합니다. 다른 환경에서는 `POSTGRES_URL`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`를 설정합니다. 테스트 전용 값은 같은 이름 앞에 `TEST_`를 붙이며 `mztrend_test`가 아닌 DB에서는 통합 테스트가 중단됩니다.

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

## EXP-002 feed 조회

fixture 기반 feed endpoint와 Kotlin 호환 요청 오류 처리를 먼저 구현해 Swagger와 자동 검사로 계약을 고정했습니다. 잘못되거나 누락된 `generation`은 FastAPI 기본 runtime 422 응답 대신 HTTP 400 `INVALID_REQUEST` wrapper를 반환합니다.

후속 단계에서는 fixture를 `FeedRepository` protocol 뒤로 옮기고 운영 dependency에는 `SqlAlchemyFeedRepository`를 연결했습니다. application lifespan이 SQLAlchemy Engine을 관리하고 요청마다 읽기 Connection을 공급합니다. SQLAlchemy Core query는 세대와 활성 상태를 필터링하고 Kotlin jOOQ query와 같은 섹션·표시 순서로 결과를 반환합니다.

DB 없는 테스트는 in-memory repository로 HTTP 계약을 계속 빠르게 검증합니다. PostgreSQL 통합 테스트는 Repository 쿼리와 기본 FastAPI dependency 흐름을 기존 Flyway schema에서 검증합니다. FastAPI는 schema를 읽기만 하며 Alembic과 DB 쓰기는 도입하지 않았습니다.

## 관련 문서

- [FastAPI 전용 작업 규칙](AGENTS.md)
- [FastAPI 백엔드 실험 로드맵](../docs/experiments/fastapi-backend.md)
- [공통 비즈니스 흐름](../docs/business-flow.md)
- [현재 작업](../docs/work-items.md)
- [Kotlin 기준 구현 규칙](../backend/AGENTS.md)
