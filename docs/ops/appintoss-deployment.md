# 앱인토스 출시 준비

## 목적

Trendzip의 공개 웹 서비스를 유지하면서, 토스 앱 안에서 실행되는 비게임 WebView 미니앱을 별도로 출시한다. 이 문서는 구현 전 아키텍처, 운영자 준비물, 검증과 심사 절차를 고정해 앱 번들·Vercel·백엔드 보안 경계를 혼동하지 않도록 한다.

## 현재 상태와 목표 구조

현재 공개 웹은 Vercel의 Next.js 서버가 Cloudflare Access Service Token을 사용해 백엔드 API를 조회한다. 이 토큰은 서버 전용 비밀정보이므로 앱인토스 WebView 번들에 포함할 수 없다.

앱인토스는 WebView SDK를 적용한 빌드 결과물인 `.ait` 번들을 콘솔에 업로드하고 토스 CDN에서 제공한다. 따라서 기존 Vercel 앱을 앱인토스에 직접 등록하거나, 서버 렌더링 Next.js 결과를 그대로 올리는 방식은 사용하지 않는다.

```text
앱인토스 WebView 번들
  -> Cloudflare Worker BFF (공개 읽기 전용)
  -> Cloudflare Access Service Token (Worker Secret)
  -> Cloudflare Tunnel
  -> Spring Boot API
```

기존 `trendzip.nadoran.com` 웹과 앱인토스 앱은 서로 다른 클라이언트로 운영한다. 둘은 같은 트렌드 데이터 계약을 사용하지만, 앱인토스 전용 UI 번들과 Worker BFF 경로를 별도로 둔다. 앱인토스 요청은 Vercel Function·Route Handler를 거치지 않는다.

## 확정 사항

- 구현 방식은 기존 React·웹 경험을 가장 빠르게 재사용할 수 있는 WebView SDK 3.x 기반으로 한다.
- 첫 출시에는 토스 로그인, 결제, 푸시와 앱인토스 서버 API를 도입하지 않는다. 광고 수익화는 앱인토스 콘솔 정책을 확인한 뒤 별도 작업으로 결정한다.
- 기존 Spring Boot API의 Cloudflare Access 보호는 유지한다.
- 앱인토스 번들은 Vercel·Cloudflare의 서버 전용 환경변수와 Cloudflare Access Client Secret을 읽지 않는다.
- 앱인토스 클라이언트가 호출하는 Cloudflare Worker BFF는 `GET` 기반의 공개 읽기 전용 엔드포인트만 제공한다.
- Worker만 Cloudflare Access Client ID·Secret을 Worker Secret으로 보관해 보호된 Spring Boot API를 호출한다. API URL, 허용 Origin 목록과 캐시 TTL은 비밀정보가 아닌 Worker 구성으로 관리한다.
- 앱인토스 Worker는 자체 Custom Domain의 유일한 원점으로 공개한다. 사용량 한도나 Worker 오류가 나도 이 호스트가 Spring Boot API로 우회하지 않도록 구성한다.
- 앱인토스 안에서는 YouTube 앱·브라우저로 이동하지 않고, 영상 선택 시 전용 화면 또는 바텀시트에서 YouTube 공식 iframe을 재생한다.
- 일반 iframe은 사용하지 않으며, 앱인토스가 예외로 허용한 YouTube 공식 iframe만 영상 재생 목적으로 사용한다.
- YouTube iframe 로드·재생에 실패하면 출처와 오류 안내만 표시하고 외부 URL 열기로 자동 전환하지 않는다.
- 첫 제출에서는 PWA 서비스 워커와 GTM·GA4를 앱인토스 번들에서 비활성화한다. 출시 후 필요성이 확인되면 별도 작업으로 도입한다.

## 운영자 결정 필요

| 항목 | 결정 기준 | 상태 |
|---|---|---|
| `appName` | kebab-case, 앱인토스 콘솔에 등록한 이름과 SDK 설정·CORS Origin이 일치해야 함 | 미정 |
| Worker 이름·Custom Domain | 예: `trendzip-appintoss-bff`, `app-api-trendzip.nadoran.com`; 기존 Tunnel API 호스트와 분리 | 미정 |
| Worker 요금제·사용량 경보 | 초기 Workers Free 일 10만 요청·10ms CPU 한도를 관찰하고, 초과 위험 시 Workers Paid 전환 | 미정 |
| 표시 이름·아이콘·기본 색상 | 콘솔 앱 정보와 WebView 번들 설정이 일치해야 함 | 미정 |
| 카테고리·서비스 소개·검색 키워드 | 비게임 서비스로서 실제 기능을 과장하지 않음 | 미정 |
| 고객 문의 채널·개인정보처리방침 | 콘솔 제출 정보와 공개 웹에서 접근 가능한 문서가 일치해야 함 | 미정 |
| 출시 시점 | 샌드박스·QR 테스트와 심사 체크리스트를 통과한 뒤 결정 | 미정 |

앱인토스 서버 API를 새로 사용할 때만 mTLS 인증서, 서버 방화벽과 토스 API 연동을 별도 설계한다. 현재 읽기 전용 트렌드 조회 MVP에는 포함하지 않는다.

## 콘솔 준비 체크리스트

1. 앱인토스 콘솔에서 비게임 미니앱을 생성하고 `appName`을 확정한다.
2. 앱 이름, 아이콘, 기본 색상, 서비스 소개, 카테고리, 고객 문의 채널과 개인정보처리방침 URL을 등록한다.
3. iOS·Android 앱인토스 샌드박스 앱과 실제 토스 앱 테스트 수단을 준비한다.
4. WebView SDK의 현재 3.x 요구사항과 콘솔의 배포·심사 항목을 다시 확인한다.
5. 앱 번들 업로드 뒤 발급되는 QR 테스트 경로로 실제 토스 앱을 검증한다.

샌드박스 테스트는 심사 요청 전에 필수다. QR 테스트 Origin과 실제 출시 Origin은 다르므로 두 환경을 모두 검증한다.

## 코드 구현 로드맵

### 1. 앱인토스 전용 WebView 프로젝트 초기화

- 저장소에 `apps-in-toss/` 프로젝트를 추가한다.
- 앱인토스 WebView SDK 3.x와 공식 빌드·패키징 구성을 적용한다.
- `appName`, 표시 이름, 아이콘, 기본 색상은 콘솔 정보와 같은 값으로 설정한다.
- 기존 화면을 무리하게 Next.js 서버 컴포넌트로 재사용하지 않고, 랜딩·피드·랭킹·키워드 상세의 데이터 계약과 표시 컴포넌트부터 단계적으로 옮긴다.

### 2. Cloudflare Worker BFF 추가

- `workers/appintoss-bff/`에 TypeScript Worker와 Wrangler 구성을 추가한다. 기존 Next.js에는 앱인토스 전용 Route Handler를 추가하지 않는다.
- Worker Custom Domain `app-api-trendzip.nadoran.com`을 앱인토스 전용 공개 API 호스트로 사용한다. `workers.dev` 주소는 개발 확인에만 쓰고 production 엔드포인트로 사용하지 않는다.
- Worker가 `API_BASE_URL`, `CLOUDFLARE_ACCESS_CLIENT_ID`, `CLOUDFLARE_ACCESS_CLIENT_SECRET`으로 보호된 Spring Boot API를 호출한다. Access Client ID·Secret은 Wrangler 설정·소스가 아닌 Worker Secret으로만 등록한다.
- 응답 DTO는 앱에 필요한 읽기 모델만 노출하고, 쓰기·운영 API·Swagger 경로는 노출하지 않는다.
- 허용한 경로·메서드만 프록시하고, 타임아웃, 오류 응답, cache key 정규화, 짧은 CDN 캐시와 요청 단위 rate limit을 적용한다.
- Worker 오류 또는 Workers Free 사용량 초과 시 보호된 API를 직접 노출하지 않고 명시적인 `5xx` 응답으로 종료한다.

### 3. CORS와 보안 경계 적용

`appName` 확정 후 Cloudflare Worker BFF의 허용 Origin을 아래 두 개로 제한한다.

```text
https://<appName>.apps.tossmini.com
https://<appName>.private-apps.tossmini.com
```

- `Access-Control-Allow-Origin`은 요청 Origin을 정확히 검증한 뒤에만 반환한다. `Origin`이 없거나 허용 목록 밖이면 CORS 헤더를 추가하지 않는다.
- CORS는 브라우저 정책일 뿐 API 인증 수단이 아니므로, Worker BFF는 공개 데이터만 제공하고 rate limit·입력 검증·응답 크기 제한을 적용한다.
- Cloudflare Access Service Token, Gemini·YouTube·DB 비밀정보, Vercel 환경변수는 앱 번들과 `.ait` 파일에 포함하지 않는다. Worker Secret은 Cloudflare Dashboard·Wrangler Secret 명령으로만 등록한다.
- 앱인토스 WebView는 보호된 Spring Boot API를 직접 호출하지 않는다.

### 사용자 실습: Worker Origin 검증

`isAllowedAppInTossOrigin(origin, appName)`를 구현한다. production·sandbox Origin만 정확히 허용하고, 접두사·포트·유사 도메인이 포함된 Origin은 거부한다. 호출부와 허용·거부 케이스 테스트는 먼저 준비하고, 이 판정 함수 구현을 사용자가 직접 작성한다.

### 4. 앱인토스 런타임 적응

- SDK 초기화, Safe Area, 로딩·오류 화면과 뒤로 가기 동작을 구현한다.
- 피드 목록은 썸네일·제목·채널·키워드만 표시하고, 카드 선택 시 앱 내부의 전용 영상 재생 화면 또는 바텀시트를 연다.
- 재생 화면은 검증된 `videoId`로 만든 `https://www.youtube.com/embed/<videoId>`만 iframe `src`로 사용한다. 피드 목록에서 여러 iframe을 동시에 로드하지 않는다.
- YouTube iframe 재생 실패, 네트워크 차단 또는 재생 불가 영상은 오류 안내와 영상 메타데이터만 표시한다. YouTube 앱·브라우저·새 탭으로 보내는 fallback은 만들지 않는다.
- 앱인토스 외부 URL 열기는 이번 출시 범위에서 사용하지 않는다. 개인정보처리방침 등 필수 외부 이동이 필요해지면 심사 전 채널톡의 서면 확인을 받고 별도 작업으로 추가한다.
- 앱인토스에서는 PWA 설치 유도와 서비스 워커를 제외한다.
- 첫 제출에는 GTM·GA4 스크립트를 끄고, 기존 동의 UI가 앱 화면을 방해하지 않는지 점검한다.
- 토스 디자인 가이드와 실제 390px 모바일 화면을 비교해 터치 영역·여백·내비게이션을 조정한다.

### 사용자 실습

`YoutubePlaybackAdapter`를 구현한다. 공개 웹 구현은 기존 YouTube 링크 이동을 유지하되, 앱인토스 구현은 검증된 `videoId`에서 iframe embed URL과 내부 재생 상태만 만든다. 허용하지 않는 host·형식의 URL, 재생 실패와 닫기 동작을 단위 테스트로 검증한다.

## 검증 및 심사 게이트

### 로컬·Mock 검증

- WebView SDK Mock 환경에서 랜딩, 세대 전환, 피드, 랭킹, 키워드 상세와 내부 YouTube 재생 화면 열기·닫기를 확인한다.
- iframe `src`가 YouTube embed URL만 사용하며, 앱인토스 경로에서 `target="_blank"`, `window.open`, SDK `openURL` 호출이 없는지 검사한다.
- Worker의 허용·비허용 Origin, 허용하지 않은 경로·메서드, 비밀정보 미노출, 백엔드 Access 헤더 전달, cache key, 오류·timeout을 테스트한다.
- `wrangler dev`의 로컬 `.dev.vars`와 배포 Worker Secret을 분리하고, 실제 Secret 값 없이도 타입 검사·단위 테스트가 가능한지 확인한다.
- 기존 공개 웹의 Next.js 빌드와 사용자 흐름이 회귀하지 않는지 확인한다.

### 샌드박스·QR 검증

- iOS·Android 샌드박스 앱에서 네트워크, 폰트, Safe Area, 뒤로 가기와 YouTube iframe 재생·닫기를 확인한다.
- `.ait` 파일을 콘솔에 업로드하고 QR 코드로 실제 토스 앱에서 같은 흐름을 확인한다.
- QR 테스트 Origin의 CORS와 실제 출시 Origin의 CORS를 각각 확인하고, Worker 요청이 Vercel이 아닌 Custom Domain으로만 향하는지 확인한다.
- Cloudflare Worker 로그에서 API 오류·cache status·사용량을 확인하고, 사용량 한도 상황에서도 보호된 API가 직접 노출되지 않는지 확인한다.
- 앱인토스 WebView에서 `localStorage`·IndexedDB를 새로 사용한다면 QR 테스트와 출시 환경의 저장소가 공유되지 않는 점을 고려한다.

### 심사 제출

- 앱 정보·노출 정보·서류를 콘솔 정보와 대조한다.
- YouTube 공식 iframe만 사용하는지, 개인정보처리방침 접근성, 재생 오류 화면과 고객 문의 경로를 확인한다.
- 외부 앱·브라우저 이동을 새로 추가하지 않는다. 불가피한 외부 이동 요구가 생기면 구현 전에 앱인토스 채널톡으로 심사 허용 여부를 확인한다.
- 기능·디자인·보안 검수에 필요한 테스트 계정이나 재현 절차가 있으면 제출 메모에 포함한다.
- 심사 승인 후 콘솔에서 출시하고 초기 Worker 오류·요청량·cache hit·사용자 흐름을 관찰한다.

## 출시 후 운영 원칙

- 첫 출시에서는 공개 웹과 앱인토스 앱의 화면·데이터 오류를 분리해 관찰한다.
- 앱인토스 SDK 버전과 Origin 정책이 변경될 때마다 CORS·저장소·Worker BFF 호출을 재검증한다.
- Workers Free 한도, Worker 로그와 cache hit을 운영 지표로 확인하고, 일 10만 요청·요청당 CPU 10ms 한도에 근접하거나 더 강한 rate limit이 필요하면 Workers Paid 전환을 검토한다.
- 토스 로그인·결제·광고·푸시·서버 API는 실제 제품 필요성이 생긴 뒤 개별 작업으로 추가한다.
- 출시 후 영상 품질 개선, 쇼츠 자동 업로드와 앱인토스 기능 확장은 서로 독립된 작업으로 관리한다.

## 공식 자료

- [앱인토스 시작하기](https://developers-apps-in-toss.toss.im/bedrock/intro.html)
- [서비스 오픈 프로세스](https://developers-apps-in-toss.toss.im/intro/onboarding-process.html)
- [토스앱 테스트하기](https://developers-apps-in-toss.toss.im/development/test/toss.html)
- [YouTube iframe 예외 공식 답변](https://techchat-apps-in-toss.toss.im/t/iframe/4098)
- [외부 브라우저 이동 관련 공식 답변](https://techchat-apps-in-toss.toss.im/t/webview/3914)
- [WebView SDK 3.x Origin과 CORS 공지](https://techchat-apps-in-toss.toss.im/t/webview-storage-cors/4673)
- [저장소 사용 가이드](https://developers-apps-in-toss.toss.im/bedrock/reference/framework/%EC%A0%80%EC%9E%A5%EC%86%8C/Storage.html)
- [Cloudflare Workers Secret](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)

공식 자료 확인일: 2026-08-30. 콘솔, SDK와 심사 정책은 변경될 수 있으므로 구현과 제출 직전에 다시 확인한다.
