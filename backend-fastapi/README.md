# Trendzip FastAPI Experiment

기존 Kotlin/Spring Boot 백엔드의 API 계약을 FastAPI로 작은 단위씩 재구현하며 Python과 FastAPI를 학습하는 실험 디렉터리입니다.

이 구현은 아직 운영 백엔드가 아닙니다. 운영 동작과 PostgreSQL migration의 기준은 각각 `backend/`의 Kotlin 코드와 Flyway migration입니다.

## 현재 단계

`EXP-001`에서 FastAPI 기본 구조, 공통 응답 model, `GET /api/health`와 pytest API 테스트를 구현합니다. 현재 Python 3.12와 uv 기반 실행 환경, 최소 FastAPI application과 OpenAPI smoke test까지 구성했습니다.

현재 구조:

```text
backend-fastapi/
├── .python-version
├── pyproject.toml
├── uv.lock
├── app/
│   ├── __init__.py
│   └── main.py
└── tests/
    └── test_app.py
```

health router, 공통 응답 schema와 계층별 디렉터리는 해당 코드를 구현할 때 추가합니다.

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

1. `app/main.py`의 `FastAPI()`에 `title="Trendzip FastAPI Experiment"`를 추가했습니다.
2. `tests/test_app.py`에서 OpenAPI JSON의 `info.title`이 같은 문자열인지 검증했습니다.
3. 저장소 루트에서 `./dev/verify-fastapi`를 실행해 검증했습니다.

이 실습은 Python keyword argument, JSON dictionary 접근, pytest `assert`와 FastAPI 설정이 OpenAPI 문서로 이어지는 방식을 익히기 위한 것입니다.

## 관련 문서

- [FastAPI 전용 작업 규칙](AGENTS.md)
- [FastAPI 백엔드 실험 로드맵](../docs/experiments/fastapi-backend.md)
- [공통 비즈니스 흐름](../docs/business-flow.md)
- [현재 작업](../docs/work-items.md)
- [Kotlin 기준 구현 규칙](../backend/AGENTS.md)
