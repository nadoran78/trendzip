# AGENTS.md — MZ 따라잡기 (프로젝트 루트)

## 프로젝트 개요

**서비스명**: MZ 따라잡기  
**한 줄 설명**: 30~40대 사용자가 10대/20대 MZ 세대의 유튜브 트렌드 피드를 체험하고 인사이트를 얻는 웹앱  
**형태**: PWA 지원 웹앱 (로그인 없이 익명 사용)

### 핵심 기능

1. 세대 선택 (10대 / 20대)
2. 선택한 세대 기반 유튜브 피드 렌더링
3. 키워드별 "왜 뜨는지" 설명 페이지
4. 세대별 트렌드 키워드 자동 수집 (크롤링 스케줄러)

---

## 모노레포 구조

```
/project-root
├── AGENTS.md             # 이 파일 (전체 프로젝트 개요)
├── /design               # 확정 프론트엔드 시안과 화면별 기준 문서
│   └── README.md          # 서비스 경로와 디자인 원본 매핑
├── /backend              # Kotlin + Spring Boot
│   └── AGENTS.md         # 백엔드 전용 명세
└── /frontend             # Next.js
    └── AGENTS.md         # 프론트엔드 전용 명세
```

---

## 전체 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router), Tailwind CSS, Vercel |
| 백엔드 | Kotlin, Spring Boot 3.x, Oracle Cloud Free Tier |
| DB | PostgreSQL (Supabase Free Tier) |
| 캐시 | Redis (Upstash Free Tier) |
| 디자인 | Claude Design → 시안 확정 후 Codex 구현 |

### 외부 API

| API | 용도 |
|-----|------|
| YouTube Data API v3 | 현재 인기 영상 조회, 후보 키워드 추출, 키워드별 영상 검색 |
| 네이버 DataLab API | YouTube 후보 키워드의 연령대별 검색 트렌드 검증 |
| Gemini API (무료 티어) | 키워드 "왜 뜨는지" 설명 자동 생성 |

---

## API 명세 (백/프론트 공통 참조)

### Swagger/OpenAPI

```
Swagger UI: /swagger-ui/index.html
OpenAPI JSON: /v3/api-docs
```

모든 API 응답은 공통 wrapper를 사용한다.

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

### 피드 조회

```
GET /api/feed?generation=TEEN
GET /api/feed?generation=TWENTY

Response:
{
  "success": true,
  "data": {
    "generation": "TEEN",
    "videos": [
      {
        "videoId": "xxx",
        "keywordId": 1,
        "title": "영상 제목",
        "channelName": "채널명",
        "thumbnailUrl": "https://...",
        "viewCount": 1200000,
        "keyword": "관련 키워드",
        "feedSection": "TODAY_PICK",
        "badge": "NEW",
        "publishedAt": "2026-06-15T15:05:34",
        "durationSeconds": 4838
      }
    ]
  },
  "error": null
}
```

### 키워드 트렌드 목록

```
GET /api/keywords?generation=TEEN

Response:
{
  "success": true,
  "data": {
    "generation": "TEEN",
    "keywords": [
      {
        "id": 1,
        "word": "키워드명",
        "rank": 1,
        "category": "음악",
        "trendScore": 88982,
        "rankTrend": "NEW",
        "rankDelta": null
      }
    ]
  },
  "error": null
}
```

### 키워드 상세 (왜 뜨는지 설명)

```
GET /api/keywords/{id}/explain

Response:
{
  "success": true,
  "data": {
    "keywordId": 1,
    "keyword": "키워드명",
    "generation": "TEEN",
    "category": "음악",
    "rank": 1,
    "trendScore": 88982,
    "rankTrend": "NEW",
    "rankDelta": null,
    "explain": "이 키워드가 뜨는 이유 설명...",
    "relatedVideos": [
      {
        "videoId": "xxx",
        "keywordId": 1,
        "title": "영상 제목",
        "channelName": "채널명",
        "thumbnailUrl": "https://...",
        "viewCount": 1200000,
        "keyword": "키워드명",
        "feedSection": "RISING",
        "badge": "HOT",
        "publishedAt": "2026-06-15T15:05:34",
        "durationSeconds": 4838
      }
    ],
    "trendGraph": [
      {
        "period": "2026-06-15",
        "ratio": 88982,
        "rank": 1
      }
    ],
    "relatedKeywords": [
      {
        "id": 2,
        "word": "관련 키워드",
        "rank": 2,
        "category": "음악",
        "trendScore": 44120,
        "rankTrend": "UP",
        "rankDelta": 1
      }
    ]
  },
  "error": null
}
```

---

## 환경변수 목록

```env
# YouTube
YOUTUBE_API_KEY=

# 네이버 DataLab
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Gemini
GEMINI_API_KEY=

# DB
POSTGRES_URL=
POSTGRES_USERNAME=
POSTGRES_PASSWORD=

# Redis
REDIS_URL=
REDIS_TOKEN=

# Frontend analytics
NEXT_PUBLIC_GTM_ID=
```

---

## 통합 검증

DB 없이 문서, diff, 백엔드 ktlint와 프론트 lint·타입 검사를 빠르게 확인한다.

```bash
./dev/verify
# 또는
./dev/verify --quick
```

PostgreSQL, Flyway, jOOQ, 백엔드 전체 build와 프론트 production build까지 확인한다.

```bash
./dev/verify --full
```

- 전체 검증은 루트 Docker Compose의 PostgreSQL을 시작하고 `mztrend_test`가 없으면 생성한다.
- 검증이 끝나도 기존 로컬 개발환경을 유지하기 위해 컨테이너를 자동 종료하지 않는다.
- 실제 YouTube, 네이버 DataLab, Gemini API는 호출하지 않는다.

비밀정보는 커밋 전 staged 변경과 전체 Git 이력을 각각 검사한다.

```bash
./dev/check-secrets --staged
./dev/check-secrets --all
```

- pre-commit과 GitHub Actions가 Gitleaks 검사를 실행한다.
- 실제 환경변수·API 키·토큰·개인키는 Git에 커밋하지 않는다.
- 상세한 CI와 비밀정보 관리 기준은 `docs/ci-and-secret-management.md`를 따른다.

---

## 수익화 로드맵 (참고용)

| 단계 | 시점 | 방법 |
|------|------|------|
| Phase 1 | 출시 직후 | 무료 서비스, 트래픽/데이터 축적 |
| Phase 2 | MAU 5,000+ | Google AdSense 적용 |
| Phase 3 | MAU 5만+ | MZ 트렌드 뉴스레터 → B2B 리포트 판매 |

---

## 협업 규칙

- 사용자가 작업계획을 요청하면 실제 구현하기 좋은 단위로 나누어 제안한다.
- 각 작업 단위는 가능하면 독립적으로 빌드/테스트/검증 가능한 범위로 잡는다.
- 큰 일정표보다 바로 착수 가능한 PR/커밋 단위의 계획을 우선한다.
- 커밋 메시지는 Conventional Commits 형식으로 작성한다.
- 커밋 제목은 `feat: 키워드 저장소 추가`, `test: PostgreSQL 테스트 DB 분리`처럼 타입 prefix는 영어, 설명은 간결한 한국어로 작성한다.
- 주로 사용하는 타입은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore`를 우선한다.

### 프로젝트 복귀와 작업 선택

- 작업을 시작할 때 저장소 루트에서 `./dev/context`를 실행한다.
- 현재 구현 상태는 `docs/project-status.md`, 비즈니스 흐름은 `docs/business-flow.md`를 기준으로 확인한다.
- `docs/work-items.md`에서 현재 브랜치와 연결된 `ACTIVE` 작업을 확인하고, 기존 활성 작업을 새 작업보다 우선한다.
- 프론트엔드 UI 작업은 구현 전에 `design/README.md`와 대상 화면의 JSX·HTML 기준 파일을 확인한다.
- 활성 `FE-*` 작업에는 `#### 디자인 기준` 섹션과 존재하는 `design/` 경로를 기록한다.
- 확정 디자인과 다르게 구현하는 항목은 이유와 대체 동작을 작업 문서의 인계 메모에 기록한다.
- 새 작업은 `READY`의 최상단 항목을 우선하며, 시작 전에 `develop`에서 직접 진행할지 작업 브랜치로 격리할지 결정한다.
- 작업의 목적, 범위, 제외 범위, 완료 조건 또는 검증 방법이 불명확하면 구현 전에 작업 정의를 보완한다.

### 작업별 브랜치

- 일반적인 단일 작업은 `develop`에서 직접 진행할 수 있다.
- 동시에 여러 Codex 세션이 구현하거나 장기·실험 작업을 격리해야 할 때는 작업별 브랜치를 사용한다.
- 작업별 브랜치는 Codex 세션이 아니라 작업 ID 기준으로 생성하고, `codex/<작업-id 소문자>-<짧은 설명>` 형식을 사용한다.
- 같은 작업을 다른 Codex 세션에서 이어갈 때는 기존 작업 위치(`develop` 또는 작업 브랜치)를 그대로 사용한다.
- `develop`에서 진행하는 `ACTIVE` 작업은 한 번에 하나만 둔다.
- 브랜치를 전환하기 전에 작업 트리가 clean한지 확인한다.
- 서로 다른 작업을 한 브랜치에 섞지 않는다.
- 동시에 여러 브랜치를 실제로 수정해야 할 때만 별도 worktree 도입을 검토한다.

### 사용자 실습 구간

- 구현 작업계획을 세울 때 사용자가 실제 코드에서 직접 구현해 볼 수 있는 작고 명확한 단위가 있는지 별도 요청이 없어도 검토한다.
- 실습이 적합하면 작업계획에 `사용자 실습`을 명시하고, Codex는 호출부·타입·테스트·완료 조건을 준비한 뒤 실제 운영 코드의 일부 구현을 사용자에게 남긴다.
- 학습만을 위한 중복 `exercise` 코드보다 실제 코드의 기능 구현이나 리팩터링을 우선한다.
- 보안, 데이터 마이그레이션, 장애 대응처럼 실패 위험이 큰 작업이나 실습 가치가 낮은 단순 변경은 Codex가 완성하고 그 이유를 설명한다.
- 사용자 실습이 남아 있는 동안에는 검증 실패가 의도된 것인지 명확히 기록하며 작업을 `REVIEW` 또는 `DONE`으로 처리하지 않는다.

### 작업 종료와 맥락 갱신

- 작업에 정의된 검증을 실행하고, 실행한 검증과 실행하지 못한 검증을 최종 보고한다.
- 파일을 생성하거나 수정한 작업의 최종 보고에는 `추천 리뷰 순서`를 포함한다.
- 추천 리뷰 순서는 가능한 경우 `진입점 -> 핵심 로직 -> 검증 코드 -> 통합 설정 -> 문서` 순으로 정리하고, 각 파일에서 확인할 내용을 한 줄로 설명한다.
- 변경 파일이 많으면 핵심 파일과 참고 파일을 구분하며, 개별 작업 문서에는 리뷰 순서를 중복 기록하지 않는다.
- 세션을 마칠 때 `ACTIVE` 작업의 진행 상황, 다음 행동, 마지막 갱신일과 검증 결과를 갱신한다.
- 다른 세션이 이어받을 수 있는 의미 있는 단위로 커밋한다.
- 구현과 검증이 끝난 작업은 `REVIEW`, `develop`에 병합된 작업은 `DONE`으로 처리한다.
- 완료한 작업은 `docs/work-items.md`의 `최근 완료`로 이동하고 최근 5개만 유지한다.
- 실제 구현 단계나 가능한 사용자 흐름이 바뀌면 `docs/project-status.md`를 현재 상태에 맞게 갱신한다.
- 비즈니스 흐름이나 핵심 규칙이 바뀐 경우에만 `docs/business-flow.md`를 갱신한다.
- 맥락 문서를 변경한 뒤에는 `./dev/check-context`를 실행한다.
- 오탈자, 주석, 단순 포맷처럼 프로젝트 상태에 영향을 주지 않는 변경은 맥락 문서를 갱신하지 않아도 된다.

---

## 전체 개발 우선순위

```
Week 1-2  백엔드 기반 (Spring Boot + YouTube API + Redis)
Week 3    크롤링 스케줄러 (YouTube 후보 수집 + 네이버 DataLab + Gemini)
Week 4    키워드 API + 프론트 기반 세팅
Week 5-6  프론트 전체 페이지 구현 + 배포
```

> 세부 작업 체크리스트는 각 backend/AGENTS.md, frontend/AGENTS.md 참조
