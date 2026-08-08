# AGENTS.md — FastAPI 실험 백엔드

> 공통 서비스 목적과 API 계약은 루트 `AGENTS.md`, 비즈니스 흐름은 `docs/business-flow.md`를 참조한다.

## 목적과 지위

- 이 디렉터리는 Python/FastAPI 학습과 기존 API 호환성 검증을 위한 실험 구현이다.
- 현재 운영 및 동작 기준은 `backend/`의 Kotlin/Spring Boot 구현이다.
- FastAPI 구현이 운영 백엔드를 대체한다고 가정하지 않는다.
- 특별한 요청이 없으면 기존 `backend/` 코드는 읽기 전용 기준으로 사용하고 수정하지 않는다.

## 현재 학습 범위

`EXP-001`에서는 다음 수직 흐름만 구현한다.

```text
FastAPI application
→ health router
→ Pydantic 공통 응답 model
→ pytest API test
→ Swagger 확인
```

PostgreSQL, SQLAlchemy, Alembic, Redis, 외부 API와 크롤링은 현재 범위가 아니다.

## 예정 기술

- Python 3.x
- FastAPI
- Pydantic
- pytest
- FastAPI TestClient (httpx2 기반)

SQLAlchemy, 비동기 DB driver와 scheduler는 해당 학습 단계에서 비교 후 결정한다.

## 구현 및 학습 규칙

- endpoint 구현 전에 대응하는 Kotlin controller, DTO와 service를 확인한다.
- 한 번에 하나의 endpoint를 수직으로 구현하고 독립적으로 테스트한다.
- Python type hint와 Pydantic model로 입출력 계약을 명시한다.
- router, schema, service와 repository의 책임을 구분하되 학습을 방해하는 과도한 추상화는 피한다.
- 전역 mutable state를 두지 않는다.
- 실제 외부 API보다 fixture와 mock을 우선한다.
- AI가 구현한 뒤 Kotlin 대응 관계와 새 Python/FastAPI 개념을 사용자에게 설명한다.
- 사용자가 직접 변경해볼 수 있는 작은 연습 항목을 구현 결과와 함께 제안한다.

## API 호환성

- URL, HTTP method, parameter와 status code를 기존 Kotlin API와 비교한다.
- 성공 응답은 루트의 `success`, `data`, `error` wrapper 계약을 유지한다.
- enum, nullable field, 날짜와 오류 응답의 직렬화 차이를 명시적으로 검증한다.
- 의도적인 차이가 필요하면 `docs/experiments/fastapi-backend.md`에 이유와 영향을 기록한다.

## 데이터베이스 원칙

- 별도 결정 전까지 `backend/src/main/resources/db/migration`의 Flyway migration이 schema 기준이다.
- FastAPI 실험에서 Alembic migration을 생성하거나 운영 schema를 변경하지 않는다.
- Kotlin과 FastAPI가 동일 DB에 동시에 migration을 수행하게 만들지 않는다.
- DB 쓰기와 transaction 경계는 별도 EXP 작업에서 결정한다.

## 비밀정보와 검증

- 실제 환경변수, API key, token과 개인키를 커밋하지 않는다.
- endpoint마다 pytest를 추가한다.
- 구현 후 formatter, type check, pytest와 저장소의 `./dev/check-secrets --staged`를 실행한다.
- 실험 진행과 학습 결과는 `docs/experiments/fastapi-backend.md`에 갱신한다.

## 완료 보고

작업 결과에는 다음을 포함한다.

- 구현 결과와 실행 방법
- 대응하는 Kotlin 코드
- 새로 사용한 Python/FastAPI 개념
- 요청부터 응답까지의 데이터 흐름
- 실행한 테스트와 미실행 검증
- 사용자가 직접 해볼 작은 변경

## 관련 문서

- 공통 규칙: `../AGENTS.md`
- Kotlin 백엔드 규칙: `../backend/AGENTS.md`
- 비즈니스 흐름: `../docs/business-flow.md`
- 현재 작업: `../docs/work-items.md`
- 실험 진행: `../docs/experiments/fastapi-backend.md`
