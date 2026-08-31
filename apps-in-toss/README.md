# Trendzip 앱인토스 WebView

앱인토스 콘솔의 `appName=trendzip`에 연결할 SDK 3.x WebView 프로젝트다. 공개 웹
`frontend/`와 분리해 관리하며, 첫 단계에서는 YouTube 공식 iframe의 앱 내부 재생만
검증한다.

## 로컬 실행

```bash
cd apps-in-toss
npm run dev
```

브라우저에서 표시되는 AIT Devtools로 iframe 로드, 재시도 화면과 모바일 폭을
확인한다. 이 단계의 정적 영상은 WebView 호환성 확인용이며 운영 피드 API를 호출하지
않는다.

## 번들 생성

```bash
npm run lint
npm run build
```

`build`는 TypeScript 검사, Vite 번들 생성, `ait build`를 차례로 실행해
`trendzip.ait`를 만든다. `.ait`와 `dist/`는 Git에 포함하지 않는다.

## 검증 범위

- iframe `src`는 검증된 11자리 YouTube video ID로 만든
  `https://www.youtube.com/embed/<videoId>`만 사용한다.
- 로드 실패나 제한 상황에서는 같은 화면에서 재시도한다. 외부 브라우저, 새 탭,
  YouTube 앱 이동 fallback은 만들지 않는다.
- 브라우저에서 iframe 문서가 로드된 것만으로 실제 토스 앱 재생을 보장하지 않는다.
  `.ait` 업로드 후 QR 테스트와 실제 토스 앱에서 최종 확인한다.

앱인토스 출시 전체 구조와 CORS·Worker BFF 계획은
[`docs/ops/appintoss-deployment.md`](../docs/ops/appintoss-deployment.md)를 따른다.
