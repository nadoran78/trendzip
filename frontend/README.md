# Trendzip Frontend

Next.js App Router 기반 MZ 따라잡기 프론트엔드입니다.

## Getting Started

환경변수 파일을 준비합니다.

```bash
cp .env.example .env.local
```

개발 서버를 실행합니다.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: local dev server
- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript type check without emitting files
- `npm run build`: production build

저장소 전체 검증은 프로젝트 루트의 `./dev/verify` 또는 `./dev/verify --full`을 사용합니다.

## Environment

```env
API_BASE_URL=http://localhost:8080
CLOUDFLARE_ACCESS_CLIENT_ID=
CLOUDFLARE_ACCESS_CLIENT_SECRET=
NEXT_PUBLIC_GTM_ID=
```

Production API:

```env
API_BASE_URL=https://api-trendzip.nadoran.com
CLOUDFLARE_ACCESS_CLIENT_ID=<Cloudflare Access service token client ID>
CLOUDFLARE_ACCESS_CLIENT_SECRET=<Cloudflare Access service token client secret>
NEXT_PUBLIC_GTM_ID=<GTM container ID>
```

API와 Cloudflare Access 환경변수는 Next.js 서버에서만 사용하며 브라우저에 노출하지 않습니다. 로컬 API가 Cloudflare Access로 보호되지 않는 경우 두 Access 환경변수는 비워둘 수 있습니다. Client ID와 Client Secret은 반드시 함께 설정하며 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.

`NEXT_PUBLIC_GTM_ID`는 공개 가능한 `GTM-XXXXXXX` 형식의 컨테이너 ID입니다. 값이 없으면 GTM만 비활성화되며 프론트는 정상 동작합니다. GA4 이벤트, Consent Mode와 운영 설정은 [분석 운영 가이드](../docs/analytics.md)를 따릅니다.
