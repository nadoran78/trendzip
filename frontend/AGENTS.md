# AGENTS.md — MZ 따라잡기 Frontend

> 전체 프로젝트 개요 및 API 명세는 루트 AGENTS.md 참조

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 스타일링 | Tailwind CSS |
| PWA | next-pwa |
| 배포 | Vercel |

---

## Claude Design 핸드오프 방식

이 프로젝트는 **Claude Design으로 UI 시안을 먼저 확정한 뒤 Codex가 구현**하는 워크플로우를 따른다.

```
Claude Design (시안 확정)
       ↓
design/README.md에서 대상 경로의 JSX + HTML 확인
       ↓
Codex가 Next.js + Tailwind로 구현
```

**Codex 작업 시 주의사항**
- `design/README.md`의 화면별 매핑을 구현 시작 전에 반드시 확인할 것
- 활성 `FE-*` 작업의 `#### 디자인 기준`에 상태 `CONFIRMED`와 참조한 `design/` 경로를 기록할 것
- JSX의 레이아웃, 색상, 컴포넌트 구조와 상호작용을 구현 기준으로 사용할 것
- HTML은 390x844 기준 브라우저 시각 비교에 사용할 것
- `ios-frame.jsx`의 기기 프레임과 `tweaks-panel.jsx`의 편집 UI는 제품에 포함하지 않을 것
- 시안과 다르게 구현해야 할 경우 코드 주석이 아니라 작업 문서의 인계 메모에 이유와 대체 동작을 기록할 것
- 완료 전 실제 화면을 디자인 원본과 비교하고 `- 디자인 검증: PASS`를 기록할 것

---

## 디자인 원칙

- **다크모드 기본** (MZ 감성, 밝은 배경 사용 금지)
- **모바일 퍼스트** 반응형 (기준 너비 390px)
- 페이지별 확정 디자인의 스크롤 및 카드 배치를 우선 적용
- 폰트: Quicksand + Pretendard, 시스템 폰트 fallback
- 컬러: 다크 배경(#0a0a0a), 포인트 컬러는 시안 기준

---

## 페이지 구성

```
/                        # 랜딩 + 세대 선택
/feed/[generation]       # 피드 메인
/trend/[generation]      # 이번 주 트렌드 키워드 목록
/keyword/[id]            # 키워드 상세 (왜 뜨는지 설명)
```

### 페이지별 UI 요구사항

**/ (랜딩)**
- 서비스 한 줄 설명
- 10대 / 20대 세대 선택 버튼 (크고 명확하게)
- 세대 선택 즉시 /feed/[generation]으로 이동

**/ feed/[generation]**
- 상단 고정 탭: 10대 / 20대 전환
- 유튜브 썸네일 카드가 세로로 스크롤
- 카드 구성: 썸네일 + 제목 + 채널명 + 관련 키워드 태그
- 카드 클릭 시 유튜브 새 탭으로 이동
- 키워드 태그 클릭 시 /keyword/[id]로 이동

**/ trend/[generation]**
- 이번 주 급상승 키워드 순위 목록
- 순위 + 키워드명 + 카테고리 + 순위 변동 표시
- 키워드 클릭 시 /keyword/[id]로 이동

**/keyword/[id]**
- 키워드명 + 카테고리
- "왜 뜨고 있나?" 설명 텍스트 (Gemini 생성)
- 관련 유튜브 영상 3개
- 최근 4주 트렌드 그래프
- 관련 키워드 태그

---

## 컴포넌트 구조

```
/components
├── feed
│   ├── FeedHeader.tsx      # 로고, 세대 탭, 티커와 화면 탭
│   ├── FeedCard.tsx        # 유튜브 영상 카드
│   └── FeedList.tsx        # 오늘의 픽과 급상승 피드 섹션
├── keyword
│   ├── KeywordCard.tsx     # 트렌드 키워드 카드
│   ├── KeywordDetail.tsx   # 키워드 상세 (설명 + 그래프)
│   └── TrendGraph.tsx      # 최근 4주 트렌드 그래프
└── common
    ├── GenerationTab.tsx   # 세대 선택 탭 공통 컴포넌트
    └── Tag.tsx             # 키워드 태그
```

---

## API 연동

- 백엔드 API 베이스 URL은 환경변수로 관리
- 모든 fetch는 Next.js App Router의 서버 컴포넌트에서 처리 (클라이언트 fetch 최소화)
- 로딩/에러 상태는 각 페이지의 loading.tsx / error.tsx로 처리

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080   # 로컬
NEXT_PUBLIC_API_BASE_URL=https://api-trendzip.nadoran.com  # 프로덕션
```

---

## 코드 컨벤션

- 컴포넌트는 함수형 + TypeScript 필수
- 페이지 컴포넌트는 서버 컴포넌트 기본, 인터랙션 필요한 경우만 `'use client'`
- 파일명: PascalCase (컴포넌트), kebab-case (페이지 폴더)
- API 타입은 `/types` 폴더에서 중앙 관리

---

## 개발 체크리스트

```
Week 4: 기반 세팅 + 핵심 페이지
  [x] Next.js 16 프로젝트 세팅 (App Router, TypeScript, Tailwind)
  [ ] next-pwa 설정
  [x] 공통 레이아웃 (FeedHeader, GenerationTab)
  [x] 랜딩 페이지 + 세대 선택 UI
  [x] 피드 페이지 (FeedCard, FeedList) + API 연동

Week 5-6: 나머지 페이지 + 배포
  [x] 트렌드 키워드 목록 페이지 + API 연동
  [ ] 키워드 상세 페이지 (설명 + TrendGraph) + API 연동
  [ ] 다크모드 전체 적용 및 모바일 반응형 점검
  [ ] Vercel 배포 설정
  [ ] PWA 동작 확인 (홈 화면 추가)
```
