# Trendzip FastAPI Experiment

기존 Kotlin/Spring Boot 백엔드의 API 계약을 FastAPI로 작은 단위씩 재구현하며 Python과 FastAPI를 학습하는 실험 디렉터리입니다.

이 구현은 아직 운영 백엔드가 아닙니다. 운영 동작과 PostgreSQL migration의 기준은 각각 `backend/`의 Kotlin 코드와 Flyway migration입니다.

## 현재 단계

`EXP-001`에서 FastAPI 기본 구조, 공통 응답 model, `GET /api/health`와 pytest API 테스트를 구현할 예정입니다.

예정 구조:

```text
backend-fastapi/
├── AGENTS.md
├── README.md
├── pyproject.toml
├── app/
│   ├── main.py
│   ├── api/
│   ├── schemas/
│   ├── services/
│   └── repositories/
└── tests/
```

실행 및 테스트 명령은 프로젝트 scaffold가 추가된 뒤 실제 도구 설정에 맞춰 기록합니다.

## 관련 문서

- [FastAPI 전용 작업 규칙](AGENTS.md)
- [FastAPI 백엔드 실험 로드맵](../docs/experiments/fastapi-backend.md)
- [공통 비즈니스 흐름](../docs/business-flow.md)
- [현재 작업](../docs/work-items.md)
- [Kotlin 기준 구현 규칙](../backend/AGENTS.md)
