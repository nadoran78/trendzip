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
├── /backend              # Kotlin + Spring Boot
│   └── AGENTS.md         # 백엔드 전용 명세
└── /frontend             # Next.js
    └── AGENTS.md         # 프론트엔드 전용 명세
```

---

## 전체 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14 (App Router), Tailwind CSS, Vercel |
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

### 피드 조회

```
GET /api/feed?generation=TEEN
GET /api/feed?generation=TWENTY

Response:
{
  "generation": "TEEN",
  "videos": [
    {
      "videoId": "xxx",
      "title": "영상 제목",
      "channelName": "채널명",
      "thumbnailUrl": "https://...",
      "viewCount": 1200000,
      "keyword": "관련 키워드"
    }
  ]
}
```

### 키워드 트렌드 목록

```
GET /api/keywords?generation=TEEN

Response:
{
  "generation": "TEEN",
  "keywords": [
    {
      "id": 1,
      "word": "키워드명",
      "rank": 1,
      "category": "음악"
    }
  ]
}
```

### 키워드 상세 (왜 뜨는지 설명)

```
GET /api/keywords/{id}/explain

Response:
{
  "keyword": "키워드명",
  "explain": "이 키워드가 뜨는 이유 설명...",
  "relatedVideos": [...],
  "trendGraph": [...],
  "relatedKeywords": [...]
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
```

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

---

## 전체 개발 우선순위

```
Week 1-2  백엔드 기반 (Spring Boot + YouTube API + Redis)
Week 3    크롤링 스케줄러 (YouTube 후보 수집 + 네이버 DataLab + Gemini)
Week 4    키워드 API + 프론트 기반 세팅
Week 5-6  프론트 전체 페이지 구현 + 배포
```

> 세부 작업 체크리스트는 각 backend/AGENTS.md, frontend/AGENTS.md 참조
