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
- 작업 브랜치: `codex/exp-001-fastapi-backend`

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
| EXP-001 | 기본 구조와 health API | FastAPI, router, Pydantic, pytest | 진행 중 |
| EXP-002 | feed 조회 API | dependency, SQLAlchemy 조회, DTO projection | 대기 |
| EXP-003 | keyword 목록 API | query parameter, enum, 정렬 | 대기 |
| EXP-004 | keyword 상세 API | 중첩 model, join, 404 처리 | 대기 |
| EXP-005 | 외부 API client | httpx, async, timeout, mock | 대기 |
| EXP-006 | 크롤링 수집 흐름 | service orchestration, validation | 대기 |
| EXP-007 | DB 쓰기와 scheduler | transaction, migration 경계, scheduling | 대기 |

각 단계는 별도 작업으로 정의하고 독립적으로 구현·검증한다. 이전 단계가 끝났다는 이유만으로 다음 단계를 자동 시작하지 않는다.

## Kotlin과 FastAPI 대응표

| 역할 | Kotlin 기준 | FastAPI 예정 | 상태 |
|---|---|---|---|
| 애플리케이션 | `MzTrendApplication.kt` | `app/main.py` | 미구현 |
| Health API | `HealthController.kt` | `app/api/health.py` | 미구현 |
| 공통 응답 | `ResponseWrapper.kt` | `app/schemas/response.py` | 미구현 |
| API 테스트 | Spring Boot controller test | `tests/test_health.py` | 미구현 |

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
- 이후 조회 단계에서도 기존 Flyway schema를 기준으로 한다.
- Alembic 도입과 schema 쓰기는 별도 의사결정 전까지 보류한다.
- Kotlin과 FastAPI가 동일 DB에 동시에 migration을 적용하지 않는다.

## 현재 진행 상황

- [x] FastAPI worktree와 `codex/exp-001-fastapi-backend` 브랜치 생성
- [x] EXP-001 ACTIVE 작업 등록
- [x] 루트와 FastAPI 전용 문서 책임 분리
- [ ] linked worktree에서 Gitleaks staged·전체 이력 검사 정상화
- [ ] Python project scaffold
- [ ] 공통 응답 model과 health API
- [ ] pytest API 테스트
- [ ] Swagger 확인과 학습 기록

## 학습 기록

아직 구현 전이다. 각 EXP 작업 완료 시 새로 사용한 Python 문법, FastAPI 개념과 Kotlin 비교를 짧게 기록한다.

## 의도적인 차이

현재 없음.

## 보류 결정

- 지원할 Python 버전과 dependency 관리 도구
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
