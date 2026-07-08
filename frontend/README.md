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
- `npm run build`: production build

## Environment

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Production API:

```env
NEXT_PUBLIC_API_BASE_URL=https://api-trendzip.nadoran.com
```
