# AGENTS.md — MZ 따라잡기 Frontend

> 전체 프로젝트 개요 및 API 명세는 루트 AGENTS.md 참조

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 스타일링 | Tailwind CSS |
| PWA | next-pwa |
| 배포 | Vercel |

---

## Claude Design 핸드오프 방식

이 프로젝트는 **Claude Design으로 UI 시안을 먼저 확정한 뒤 Codex가 구현**하는 워크플로우를 따른다.

```
Claude Design (시안 확정)
       ↓
시안 이미지 + 이 AGENTS.md를 Codex에 함께 전달
       ↓
Codex가 Next.js + Tailwind로 구현
```

**Codex 작업 시 주의사항**
- 시안 이미지가 제공된 경우 레이아웃/색상/컴포넌트 구조를 최대한 충실히 반영할 것
- 시안과 다르게 구현해야 할 경우 반드시 주석으로 이유를 명시할 것

---

## 디자인 원칙

- **다크모드 기본** (MZ 감성, 밝은 배경 사용 금지)
- **모바일 퍼스트** 반응형 (기준 너비 390px)
- **틱톡 스타일** 세로 풀스크린 카드 피드
- 폰트: 시스템 폰트 기본, 필요시 Pretendard 적용
- 컬러: 다크 배경(#0a0a0a), 포인트 컬러는 시안 기준

---

## 페이지 구성

```
/                        # 랜딩 + 세대 선택
/feed/[generation]       # 피드 메인 (틱톡 스타일 세로 스크롤)
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
├── layout
│   ├── Header.tsx          # 상단 세대 선택 탭
│   └── BottomNav.tsx       # 하단 네비게이션
├── feed
│   ├── FeedCard.tsx        # 유튜브 영상 카드
│   └── FeedList.tsx        # 피드 스크롤 컨테이너
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
NEXT_PUBLIC_API_BASE_URL=https://api.mztrend.kr  # 프로덕션
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
  [ ] Next.js 14 프로젝트 세팅 (App Router, TypeScript, Tailwind)
  [ ] next-pwa 설정
  [ ] 공통 레이아웃 (Header, BottomNav, GenerationTab)
  [ ] 랜딩 페이지 + 세대 선택 UI
  [ ] 피드 페이지 (FeedCard, FeedList) + API 연동

Week 5-6: 나머지 페이지 + 배포
  [ ] 트렌드 키워드 목록 페이지 + API 연동
  [ ] 키워드 상세 페이지 (설명 + TrendGraph) + API 연동
  [ ] 다크모드 전체 적용 및 모바일 반응형 점검
  [ ] Vercel 배포 설정
  [ ] PWA 동작 확인 (홈 화면 추가)
```
