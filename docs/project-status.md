# 프로젝트 현재 상태

- 마지막 갱신: 2026-08-05
- 현재 단계: 핵심 사용자 흐름 공개 배포 및 운영 보완
- 현재 집중 영역: 운영 데이터 품질과 자동 검증 보완

## 한 줄 상태

백엔드의 트렌드 수집·저장·조회 API와 확정 디자인을 반영한 랜딩·세대별 피드·랭킹·키워드 상세 화면이 구현됐으며, 운영 API를 Cloudflare Access로 보호한 상태에서 `trendzip.nadoran.com`의 핵심 탐색 흐름과 iOS 홈 화면 설치를 사용할 수 있다.

## 구현 현황

### 백엔드

- 구현됨: YouTube 인기 영상 기반 후보 수집과 Gemini 키워드 추출
- 구현됨: 후보 근거 영상 검증, 범용어 제거, 전체 작품명 우선 처리와 동일 영상 근거 기반 관련 키워드 판정
- 구현됨: 네이버 DataLab 기반 TEEN/TWENTY 트렌드 점수 산정
- 구현됨: 키워드별 영상 수집, 피드 큐레이션, 관련 키워드 구성
- 구현됨: Gemini 키워드 설명 생성과 갱신 정책
- 구현됨: PostgreSQL/Flyway/JPA/jOOQ 기반 저장 및 조회
- 구현됨: 피드, 키워드 목록, 키워드 설명 상세, 헬스체크 API
- 구현됨: 외부 API 클라이언트와 크롤링 주요 정책에 대한 테스트

### 프론트엔드

- 구현됨: Next.js App Router, TypeScript, Tailwind CSS 기반 설정
- 구현됨: 확정 시안 기반 랜딩 페이지와 10대/20대 선택 경로
- 구현됨: 공통 API wrapper 타입, API client, 피드·키워드 API 함수
- 구현됨: 실제 피드 API 기반 세대 전환, 티커, 섹션형 영상 카드, 로딩·오류·빈 결과 화면
- 구현됨: 최신 완료 크롤링 결과 기반 트렌드 키워드 순위와 변동, 로딩·오류·빈 결과 화면
- 구현됨: 키워드 설명, 검색 관심도 그래프, 관련 영상과 관련 키워드를 제공하는 상세 화면
- 구현됨: 피드 키워드 태그와 랭킹 행에서 상세 화면으로 이어지는 탐색 경로
- 구현됨: 서버 전용 API 환경변수와 Node.js 24 기반 Vercel 공개 배포
- 구현됨: Vercel 서버의 운영 API 요청에 Cloudflare Access Service Token 헤더를 추가하는 서비스 인증 설정
- 구현됨: 페이지별 SEO metadata와 canonical URL, Open Graph·Twitter 공유 이미지, robots와 동적 sitemap
- 구현됨: Web App Manifest, 일반·maskable·Apple 아이콘, Serwist 서비스 워커와 오프라인 fallback
- 검증됨: 운영 iOS Safari 홈 화면 추가
- 미구현: Android Chrome 홈 화면 설치 확인과 프론트엔드 자동 테스트

### 인프라 및 배포

- 구현됨: 로컬 PostgreSQL과 Redis용 Docker Compose
- 구현됨: 백엔드 Docker 이미지와 운영 Compose 구성
- 구현됨: Gitleaks 검사 후 전체 통합 검증을 실행하는 GitHub Actions CI
- 구현됨: Vercel 프론트엔드 production 배포와 `trendzip.nadoran.com` 커스텀 도메인
- 구현됨: `main`에서 수동 실행하는 GitHub Actions 프론트엔드 production 배포와 Git 자동 배포 비활성화
- 구현됨: 특정 Vercel Service Token만 허용하는 Cloudflare Access 기반 운영 API 보호
- 일부 구현됨: 맥미니 수동 배포 절차는 있으나 자동 배포 workflow는 없음

### 테스트 및 자동화

- 구현됨: 백엔드 ktlint와 Gradle 테스트
- 구현됨: 외부 API를 실제 호출하지 않는 mock 기반 client 테스트
- 구현됨: DB 없는 빠른 검사와 PostgreSQL·Flyway·jOOQ·전체 build를 포함하는 저장소 통합 검증 명령
- 구현됨: 전체 Git 이력과 staged 변경을 검사하는 Gitleaks 명령과 pre-commit 훅
- 구현됨: pull request와 `develop` push용 GitHub Actions CI
- 미구현: OpenAPI와 프론트엔드 타입의 자동 계약 검증

### 문서화

- 구현됨: 서비스 소개, 실제 화면, 데이터 흐름, 아키텍처, 로컬 실행과 검증 절차를 제공하는 루트 README
- 구현됨: 프로젝트 상태, 비즈니스 흐름, 백엔드 컨벤션, Mac mini와 Vercel 프론트엔드 운영 문서

## 현재 가능한 사용자 흐름

1. 사용자가 `trendzip.nadoran.com`의 랜딩 페이지에 진입한다.
2. 10대 또는 20대 피드를 선택한다.
3. 선택한 세대의 피드 경로로 이동한다.
4. 해당 세대의 실제 YouTube 트렌드 피드를 탐색한다.
5. 피드 카드를 선택해 YouTube 영상을 새 탭에서 확인한다.
6. 같은 세대의 랭킹 화면으로 이동해 급상승 키워드와 순위 변화를 비교한다.
7. 피드의 키워드 태그 또는 랭킹 행을 선택해 상세 화면으로 이동한다.
8. 뜨는 이유, 검색 관심도 추이, 관련 영상과 관련 키워드를 확인한다.

## 주요 미완성 영역

1. 프론트 핵심 사용자 흐름 자동 테스트
2. OpenAPI와 프론트 TypeScript 타입의 계약 자동화
3. 프론트엔드 이전 production deployment 수동 롤백
4. Android Chrome 홈 화면 설치 호환성 확인

활성 작업, 작업 브랜치와 우선순위는 [작업 목록](work-items.md)을 기준으로 한다.

## 알려진 문제와 제약

- 백엔드 DB 통합 테스트는 기본적으로 로컬 PostgreSQL의 `mztrend_test` 데이터베이스에 의존한다.
- API 계약이 Kotlin DTO, 루트 API 예시, 프론트 TypeScript 타입에 중복되어 있다.
- 프론트엔드에는 사용자 흐름을 검증하는 자동 테스트가 없다.
- 실제 크롤링 검증은 YouTube, 네이버 DataLab, Gemini API quota를 소비한다.
- PWA 설치 메뉴와 홈 화면 아이콘 표현은 브라우저와 OS별로 달라 Android 실기기 동작은 아직 확인하지 못했다.

## 로컬 실행

백엔드 의존 서비스를 시작한다.

```bash
docker compose up -d
```

백엔드를 실행한다.

```bash
cd backend
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

프론트엔드를 실행한다.

```bash
cd frontend
npm run dev
```

프로젝트에 복귀할 때는 저장소 루트에서 다음 명령을 먼저 실행한다.

```bash
./dev/context
```

작업 중 빠른 검사와 배포 전 전체 검사는 다음 명령을 사용한다.

```bash
./dev/verify
./dev/verify --full
```

비밀정보는 커밋 전 staged 변경과 전체 Git 이력을 검사한다.

```bash
./dev/check-secrets --staged
./dev/check-secrets --all
```

## 관련 문서

- [프로젝트 README](../README.md)
- [비즈니스 흐름](business-flow.md)
- [현재 작업과 다음 작업](work-items.md)
- [CI와 비밀정보 관리](ci-and-secret-management.md)
- [Vercel 프론트엔드 수동 배포](ops/frontend-deployment.md)
- [프로젝트 작업 규칙](../AGENTS.md)
