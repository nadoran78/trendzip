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
```

Production API:

```env
API_BASE_URL=https://api-trendzip.nadoran.com
CLOUDFLARE_ACCESS_CLIENT_ID=<Cloudflare Access service token client ID>
CLOUDFLARE_ACCESS_CLIENT_SECRET=<Cloudflare Access service token client secret>
```

세 환경변수는 Next.js 서버에서만 사용하며 브라우저 공개 환경변수로 노출하지 않습니다. 로컬 API가 Cloudflare Access로 보호되지 않는 경우 두 Access 환경변수는 비워둘 수 있습니다. Client ID와 Client Secret은 반드시 함께 설정하며 `NEXT_PUBLIC_` 접두사를 사용하지 않습니다.
