# FastAPI 백엔드 실험

## 실험 목적

기존 Kotlin/Spring Boot 백엔드의 비즈니스 동작과 API 계약을 작은 수직 흐름으로 FastAPI에 재구현하며 Python, FastAPI, Pydantic과 pytest를 학습한다.

목표는 즉시 운영 백엔드를 교체하는 것이 아니라 기술 차이를 이해하고, API 호환성과 유지보수 가능성을 검증한 뒤 전환 여부를 판단하는 것이다.

## 운영 기준과 실험 구현 구분

- 운영 코드와 동작 기준: `backend/`
- 실험 코드: `backend-fastapi/`
- 공통 API 계약: 루트 `AGENTS.md`
- 공통 비즈니스 규칙: `docs/business-flow.md`
- DB schema와 migration 기준: Kotlin 백엔드의 Flyway migration
- 작업 브랜치: `experiment/fastapi-backend`

FastAPI 구현의 차이는 이 문서에 이유와 영향을 기록한다. 별도 결정 전에는 운영 배포, traffic 전환과 Kotlin 코드 삭제를 수행하지 않는다.

## 학습 원칙

1. 대응하는 Kotlin 코드를 먼저 읽고 입력, 출력과 책임을 정리한다.
2. endpoint 하나를 application부터 test까지 수직으로 완성한다.
3. 구현 후 Kotlin과 Python의 차이를 설명한다.
4. AI가 만든 코드 중 작은 변경을 사용자가 직접 수행한다.
5. 새 도구는 필요한 단계에서만 도입하고 선택 이유를 기록한다.

## 단계별 이전 계획

| 작업 | 범위 | 주요 학습 | 상태 |
|---|---|---|---|
| EXP-001 | 기본 구조와 health API | FastAPI, router, Pydantic, pytest | 완료, 병합 판단 보류 |
| EXP-002 | feed 조회 API | enum, 중첩 model, dependency, SQLAlchemy 조회 | 진행 중: fixture 완료, SQLAlchemy 준비 |
| EXP-003 | keyword 목록 API | query parameter, enum, 정렬 | 대기 |
| EXP-004 | keyword 상세 API | 중첩 model, join, 404 처리 | 대기 |
| EXP-005 | 외부 API client | httpx, async, timeout, mock | 대기 |
| EXP-006 | 크롤링 수집 흐름 | service orchestration, validation | 대기 |
| EXP-007 | DB 쓰기와 scheduler | transaction, migration 경계, scheduling | 대기 |

각 단계는 별도 작업으로 정의하고 독립적으로 구현·검증한다. 이전 단계가 끝났다는 이유만으로 다음 단계를 자동 시작하지 않는다.

## Kotlin과 FastAPI 대응표

| 역할 | Kotlin 기준 | FastAPI 예정 | 상태 |
|---|---|---|---|
| 애플리케이션 | `MzTrendApplication.kt` | `app/main.py` | scaffold와 title 완료 |
| Health API | `HealthController.kt` | `app/api/health.py` | factory 적용 완료 |
| 공통 응답 | `ResponseWrapper.kt` | `app/schemas/response.py` | generic model과 factory 완료 |
| API 테스트 | Spring Boot controller test | `tests/test_app.py`, `tests/test_health.py`, `tests/test_response.py` | 응답 계약과 OpenAPI 자동 검증 완료 |

## API 호환성 기준

다음 항목을 Kotlin 응답과 비교한다.

- URL과 HTTP method
- query와 path parameter
- HTTP status
- `success`, `data`, `error` 공통 wrapper
- enum 문자열과 nullable field
- 날짜와 시간 직렬화
- 오류 code와 message
- 목록의 정렬 순서

## 데이터베이스 원칙

- EXP-001은 DB에 연결하지 않는다.
- EXP-002는 fixture로 API 계약을 먼저 고정한 뒤 별도 작업 단위에서 SQLAlchemy 읽기 repository를 연결한다.
- 이후 조회 단계에서도 기존 Flyway schema를 기준으로 한다.
- Alembic 도입과 schema 쓰기는 별도 의사결정 전까지 보류한다.
- Kotlin과 FastAPI가 동일 DB에 동시에 migration을 적용하지 않는다.

## 현재 진행 상황

- [x] FastAPI worktree와 `experiment/fastapi-backend` 장기 학습 브랜치 생성
- [x] EXP-001 ACTIVE 작업 등록
- [x] 루트와 FastAPI 전용 문서 책임 분리
- [x] linked worktree에서 Gitleaks staged·전체 이력 검사 정상화
  - [x] staged index snapshot 검사와 합성 비밀정보 탐지
  - [x] Git common directory와 전체 이력 검사
- [x] Python project scaffold
  - [x] Python 3.12·uv·uv.lock 기반 실행 환경
  - [x] Ruff·mypy·pytest 통합 검증과 OpenAPI smoke test
  - [x] 애플리케이션 title과 OpenAPI title assertion 실습
- [x] 공통 응답 model과 health API
  - [x] Pydantic generic wrapper와 health response model
  - [x] 직접 생성 방식의 health router와 Kotlin 호환 응답
  - [x] `success_response` classmethod 리팩터링 실습
- [x] pytest API 테스트
- [x] Swagger 확인과 학습 기록
- [ ] EXP-002 feed 조회 API
  - [x] Kotlin controller·DTO·service 계약 확인
  - [x] 공통 camelCase model과 enum 기반 구성
  - [x] 사용자 `FeedVideoResponse` type hint 실습
  - [x] TEEN fixture service·dependency와 feed router
  - [x] 성공·빈 목록·OpenAPI baseline 테스트
  - [x] 사용자 TWENTY fixture와 응답 테스트 실습
  - [x] Kotlin 호환 요청 검증 오류 wrapper
  - [x] fixture Swagger와 전체 검증
  - [ ] SQLAlchemy 읽기 repository

## 학습 기록

### 프로젝트 scaffold

- 시스템 Python 3.9와 실험 환경을 분리하고 `.python-version`으로 Python 3.12를 요청한다.
- `pyproject.toml`은 프로젝트 metadata, 실행·개발 의존성과 도구 설정을 모은다.
- `uv.lock`은 실제 설치할 transitive dependency 버전까지 고정한다.
- `app.main`의 `FastAPI` 객체는 Spring Boot의 `MzTrendApplication`에 대응하는 ASGI application 진입점이다.
- FastAPI `TestClient`로 서버 process 없이 `/openapi.json`을 요청해 application이 정상 조립되는지 확인한다.
- `python -m pytest`로 실행하면 현재 프로젝트 디렉터리가 Python module 검색 경로에 포함된다.
- `FastAPI(title=...)`로 Python keyword argument를 사용하고 그 값이 OpenAPI `info.title`로 직렬화되는지 확인했다.
- HTTP response는 `response.json()`으로 JSON object를 얻은 뒤 `['info']['title']`처럼 dictionary key로 접근한다.
- pytest의 일반 `assert`로 실제 OpenAPI 계약과 기대 문자열을 비교한다.

### Health API baseline

- `BaseModel`의 type annotation으로 응답 field를 선언하면 Pydantic이 runtime validation, serialization과 JSON Schema 생성을 담당한다.
- Python 3.12의 `class ResponseWrapper[DataT]` 문법은 Kotlin `ResponseWrapper<T>`처럼 data 타입을 endpoint별로 구체화한다.
- `APIRouter(prefix="/api", tags=["Health"])`는 health path operation을 별도 module로 묶고 `app.include_router()`가 이를 application에 등록한다.
- health는 DB나 외부 I/O가 없으므로 일반 `def`로 구현하고 service·repository 계층은 추가하지 않는다.
- `response_model=ResponseWrapper[HealthResponse]`는 실제 반환값을 검증·직렬화하고 OpenAPI 응답 schema를 만든다.
- `response_model_exclude_none`의 기본값을 유지해 Kotlin 계약처럼 `error`를 생략하지 않고 `null`로 반환한다.
- TestClient로 HTTP 200, 전체 JSON 계약과 OpenAPI의 path·tag·summary를 서버 process 없이 검증한다.

### 공통 성공 응답 factory

- `@classmethod`는 class 자체를 `cls`로 받아 생성 책임을 `ResponseWrapper` 안에 둔다.
- `Self`는 factory를 호출한 실제 class가 반환된다는 점을 type checker에 표현한다.
- `success_response(data: DataT)`는 입력 data와 `ResponseWrapper`의 generic type을 연결한다.
- `ResponseWrapper[HealthResponse]`로 타입 인자를 명시하면 mypy가 추론한 정적 타입뿐 아니라 Pydantic 런타임 model도 구체화된다.
- 성공 응답의 `success=True`와 `error=None` 규칙을 factory 한곳에 모으고, API 테스트로 기존 JSON 계약이 유지되는지 확인했다.
- Swagger UI에서 `GET /api/health`, `ResponseWrapper[HealthResponse]` schema와 실제 `200` 응답을 확인했다.

### Feed API 계약 준비

- Kotlin `Generation`과 `FeedSection`은 Python `StrEnum`으로 표현해 query와 JSON에서 같은 문자열을 사용한다.
- Python field는 snake_case를 사용하고 Pydantic alias generator가 Kotlin JSON 계약의 camelCase로 직렬화한다.
- Kotlin `Long`, nullable type, `LocalDateTime`과 중첩 목록을 Python type hint로 옮기는 실습을 먼저 수행한다.
- 첫 구현은 DB 없이 fixture를 사용하며, SQLAlchemy 연결 전에도 router와 응답 계약을 독립적으로 검증할 수 있게 한다.
- `Annotated[FeedService, Depends(get_feed_service)]`는 router가 service 생성 방법을 직접 알지 않게 하고 FastAPI가 요청마다 dependency를 공급하게 한다.
- 테스트는 `app.dependency_overrides`로 같은 endpoint에 빈 service를 주입해 DB나 전역 mutable state 없이 빈 목록 계약을 확인한다.
- fixture tuple의 순서는 Kotlin repository가 반환할 표시 순서를 나타낼 뿐, fixture service가 정렬 규칙을 다시 구현하지 않는다.

### 요청 검증 오류

- FastAPI는 enum 변환 실패와 필수 query 누락을 `RequestValidationError`로 처리하고 기본적으로 HTTP 422와 자체 `detail` JSON을 반환한다.
- 전역 handler는 요청 검증 오류만 HTTP 400으로 바꾸고 `ResponseWrapper[None].failure_response()`로 Kotlin의 `INVALID_REQUEST` 계약을 반환한다.
- 응답 model 검증 실패는 다른 예외이므로 이 handler가 가리지 않으며 내부 응답 오류를 잘못된 사용자 요청으로 처리하지 않는다.
- FastAPI가 자동 생성한 OpenAPI에는 runtime handler와 별개로 기본 422 응답 문서가 남는다. 현재는 400 wrapper를 추가로 명시하고, 자동 422 문서 제거는 OpenAPI customization 필요성을 판단할 때 결정한다.
- Swagger UI에서 TEEN과 TWENTY가 각각 세대별 fixture 두 건을 HTTP 200 wrapper로 반환하고, 잘못된 generation은 runtime에서 HTTP 400으로 처리되는 것을 확인했다.
- `Generation`, `FeedResponse`, `FeedVideoResponse`, 성공 wrapper와 오류 wrapper schema가 OpenAPI에 함께 노출되는 것을 확인했다.

## 의도적인 차이

- feed API의 실제 validation 응답은 Kotlin과 같은 HTTP 400 wrapper지만 FastAPI 자동 OpenAPI에는 기본 422 schema도 함께 표시된다. 이를 제거하기 위한 전역 OpenAPI customization은 아직 도입하지 않는다.

## 보류 결정

- sync 또는 async SQLAlchemy
- PostgreSQL driver
- Alembic 도입 여부
- Redis client와 cache 방식
- scheduler 도구
- 운영 배포와 traffic 전환 여부

## 종료 및 전환 조건

다음 중 하나를 명시적으로 선택할 때 실험 상태를 변경한다.

- 학습 목표를 달성하고 실험을 종료한다.
- 일부 Python 서비스만 별도로 유지한다.
- Kotlin과 FastAPI를 일정 기간 병행 검증한다.
- API·데이터·운영 전환 계획을 별도 승인하고 정식 이전을 시작한다.
