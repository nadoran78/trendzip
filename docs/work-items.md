# 작업 목록

## 작업 선택 규칙

1. `NOW`에는 한 번에 하나의 작업만 둔다.
2. `NOW`가 있으면 새 작업보다 먼저 이어서 진행한다.
3. 작업을 시작하기 전에 목적, 범위, 제외 범위, 완료 조건과 검증 방법을 확인한다.
4. 한 PR에서 검증하기 어려운 크기라면 작업을 나눈다.
5. `NOW`가 완료되면 `NEXT` 최상단 작업을 승격한다.
6. `NEXT`는 위에서 아래 순서로 우선하며 최대 5개만 유지한다.
7. 완료 이력은 최근 5개만 남기고 나머지는 Git 로그에서 확인한다.

## NOW

### FE-001 실제 피드 조회 및 카드 렌더링

#### 목적

세대를 선택한 사용자가 백엔드에 수집된 실제 YouTube 피드를 확인할 수 있게 한다.

#### 범위

- 세대 경로를 `TEEN` 또는 `TWENTY` API 요청으로 변환한다.
- 서버 컴포넌트에서 `getFeed`를 호출한다.
- 썸네일, 제목, 채널명, 조회수와 대표 키워드를 영상 카드에 표시한다.
- 영상 선택 시 올바른 YouTube URL을 새 탭으로 연다.
- 대표 키워드 선택 시 키워드 상세 경로로 이동한다.
- 피드가 비어 있는 상태를 안내한다.
- App Router 방식으로 로딩과 오류 상태를 제공한다.

#### 제외 범위

- 영상 자동 재생
- 무한 스크롤
- 트렌드 키워드 목록 페이지
- 키워드 상세 페이지 구현
- PWA 설정
- 시각 회귀 테스트

#### 완료 조건

- `/feed/teen`은 `generation=TEEN`으로 피드를 요청한다.
- `/feed/twenty`는 `generation=TWENTY`로 피드를 요청한다.
- 응답 영상의 썸네일, 제목, 채널명, 조회수와 대표 키워드가 표시된다.
- 영상 링크가 `https://www.youtube.com/watch?v={videoId}` 형식으로 열린다.
- 키워드 링크가 `/keyword/{keywordId}`로 이동한다.
- 빈 피드와 API 오류가 정상 피드와 구분되어 표시된다.
- 390px 너비에서 핵심 정보와 링크를 사용할 수 있다.

#### 관련 코드

- `frontend/src/app/feed/[generation]/page.tsx`
- `frontend/src/services/trend-api.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/lib/generation.ts`
- `frontend/src/types/api.ts`

#### 검증

```bash
cd frontend
npm run lint
npm run build
```

## NEXT

### FE-002 트렌드 키워드 목록 페이지

세대별 급상승 키워드 순위와 변동 정보를 표시하고 키워드 상세로 연결한다.

### FE-003 키워드 상세 페이지

뜨는 이유, 관련 영상, 최근 추이와 관련 키워드를 상세 API와 연결한다.

### CHORE-001 통합 검증 명령 추가

백엔드와 프론트엔드의 빠른 검사 및 전체 검사를 저장소 루트 명령으로 통일한다.

### CHORE-002 GitHub Actions CI 추가

로컬 통합 검증 명령을 pull request와 main push에서 자동 실행한다.

### FE-004 PWA 및 배포 마무리

핵심 사용자 흐름이 완성된 뒤 설치 가능한 PWA와 프론트 배포 설정을 마무리한다.

## LATER

- OpenAPI와 프론트 TypeScript 타입의 계약 자동화
- 외부 API fixture 기반 크롤링 전체 시나리오 테스트
- 프론트 핵심 사용자 흐름 E2E 테스트
- 아키텍처 규칙 자동 검사

## 최근 완료

- 2026-07-21 `DOCS-001`: 프로젝트 맥락 복구 harness 구축
