# GA4·GTM 사용자 행동 분석 운영 가이드

## 목적과 구성

Trendzip은 Vercel Web Analytics로 기본 운영 트래픽을 확인하고, Google Tag Manager(GTM)를 통해 Google Analytics 4(GA4)에 비식별 사용자 행동 이벤트를 전송한다.

```text
Next.js 사용자 행동
  -> window.dataLayer
  -> GTM Web 컨테이너
  -> GA4 Google tag
  -> GA4 Realtime·DebugView·보고서
```

- GA4를 `GoogleAnalytics` 컴포넌트나 `gtag.js`로 직접 추가하지 않는다.
- GTM을 GA4 전송의 유일한 경로로 사용한다.
- 로그인 사용자 식별자, 이름, 이메일, 전화번호와 자유 입력값을 전송하지 않는다.
- `NEXT_PUBLIC_GTM_ID`가 없으면 GTM만 로드하지 않고 서비스 기능은 정상 제공한다.

## 환경변수

Vercel Production 환경에 다음 공개 식별자를 등록한다.

```env
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

`G-XXXXXXXXXX` 형식의 GA4 측정 ID는 GTM의 Google tag 설정에만 사용한다. 저장소 환경변수와 Next.js 코드에는 중복 등록하지 않는다.

## page_view 단일 소유권

첫 진입과 App Router 클라이언트 이동의 `page_view`는 GA4 웹 스트림의 향상된 측정 중 `페이지 조회 -> 브라우저 방문 기록 이벤트에 따른 페이지 변경`이 담당한다.

- 앱 코드에서 `page_view`를 `dataLayer`에 직접 추가하지 않는다.
- GTM에 별도 History Change 기반 `page_view` 이벤트 태그를 만들지 않는다.
- Google tag를 `Initialization - All Pages`에서 한 번 실행한다.
- 배포 후 Tag Assistant와 DebugView에서 첫 진입과 내부 링크 이동마다 `page_view`가 한 번인지 확인한다.

이 원칙을 바꾸려면 향상된 측정의 방문 기록 기반 페이지 조회를 먼저 끄고 코드 전송 방식으로 완전히 교체해야 한다. 두 방식을 동시에 사용하지 않는다.

## 애플리케이션 이벤트 명세

| 이벤트 | 발생 지점 | 매개변수 |
|---|---|---|
| `select_generation` | 랜딩에서 10대·20대 최초 선택 | `generation`, `entry_point` |
| `generation_change` | 피드·랭킹에서 세대 탭 변경 | `from_generation`, `to_generation`, `content_view` |
| `youtube_video_click` | 피드 카드 또는 키워드 관련 영상 클릭 | `generation`, `video_id`, `keyword_id`, `keyword`, `feed_section`, `click_area` |
| `view_keyword_detail` | 키워드 상세 화면 진입 | `generation`, `keyword_id`, `keyword`, `rank`, `keyword_category` |
| `related_keyword_click` | 상세 화면의 관련 키워드 클릭 | `generation`, `keyword_id`, `related_keyword_id`, `related_keyword` |

세대 값은 `TEEN`, `TWENTY`만 사용한다. `keyword_id`, `video_id`는 서비스 콘텐츠 식별자이며 사용자 식별자가 아니다.

## Consent Mode v2

루트 레이아웃의 `beforeInteractive` 스크립트가 GTM보다 먼저 다음 기본값을 설정한다.

| 동의 항목 | 첫 방문 | 분석 허용 후 | 분석 거부 후 |
|---|---|---|---|
| `analytics_storage` | `denied` | `granted` | `denied` |
| `ad_storage` | `denied` | `denied` | `denied` |
| `ad_user_data` | `denied` | `denied` | `denied` |
| `ad_personalization` | `denied` | `denied` | `denied` |

선택은 `trendzip.analytics-consent.v1` 로컬 스토리지에 저장한다. 사용자는 `/privacy`에서 설정을 다시 열어 허용, 거부 또는 철회할 수 있다. 거부 시 접근 가능한 Google Analytics 쿠키 삭제도 시도한다.

현재 방식은 Advanced Consent Mode다. 저장 동의가 거부된 상태에서도 Google 태그가 쿠키 없는 동의 상태와 제한된 측정 신호를 전송할 수 있다. 광고 기능을 도입하기 전까지 광고 관련 동의는 허용하지 않는다.

## GTM 운영자 설정 실습

코드 배포 전에 GTM Preview에서 다음 순서로 구성한다.

1. `Google tag - GA4` 태그를 만든다.
2. Tag ID에 GA4 웹 스트림의 `G-XXXXXXXXXX`를 입력한다.
3. Trigger는 `Initialization - All Pages`를 사용한다.
4. Preview에서 Consent 탭의 네 동의값과 Google tag 실행을 확인한다.
5. 각 이벤트 매개변수용 Data Layer Variable을 만든다.
6. 위 다섯 Custom Event 각각에 GA4 Event 태그와 같은 이름의 Custom Event Trigger를 연결한다.
7. 이벤트에 해당하는 Data Layer Variable만 Event Parameters로 전달한다.
8. Preview와 GA4 DebugView 검증이 끝난 뒤 버전 설명을 작성하고 게시한다.

GA4 일반 보고서에서 이벤트 매개변수를 분석하려면 필요한 값만 이벤트 범위 Custom Dimension으로 등록한다. 우선순위는 `generation`, `feed_section`, `entry_point`, `click_area`, `content_view`, `keyword_id`이며 사용하지 않을 차원을 과도하게 만들지 않는다.

## 로컬 확인

브라우저 개발자 도구 콘솔에서 최근 Data Layer 값을 확인한다.

```js
window.dataLayer
```

저장된 분석 동의를 확인하거나 첫 방문 상태를 다시 시험한다.

```js
localStorage.getItem("trendzip.analytics-consent.v1")
localStorage.removeItem("trendzip.analytics-consent.v1")
location.reload()
```

`NEXT_PUBLIC_GTM_ID`를 설정하지 않은 로컬 환경에서도 동의 UI와 Data Layer 이벤트는 확인할 수 있지만 Google 네트워크 요청은 발생하지 않는다.

## Vercel Web Analytics와 GA4 수치 차이

두 도구의 방문자와 페이지 조회는 같은 숫자가 될 필요가 없다.

- Vercel Web Analytics와 GA4는 방문자 식별, 세션, 봇 제외와 처리 시점이 다르다.
- GA4는 사용자의 분석 동의와 브라우저 추적 차단의 영향을 받는다.
- Advanced Consent Mode의 거부 상태 데이터는 허용 상태와 동일한 상세 데이터가 아니다.
- 운영 판단에서는 한 도구의 동일 지표 추이를 비교하고 서로 다른 도구의 절대값을 직접 합산하지 않는다.

## 운영 검증 체크리스트

1. 동의 선택 전 Consent 탭의 네 항목이 `denied`인지 확인한다.
2. 분석 허용 직후 `analytics_storage`만 `granted`인지 확인한다.
3. 분석 거부와 철회 후 네 항목이 다시 `denied`인지 확인한다.
4. 첫 진입과 내부 경로 이동에서 `page_view`가 각각 한 번인지 확인한다.
5. 다섯 행동 이벤트의 이름과 매개변수가 Data Layer, GTM Preview와 DebugView에서 일치하는지 확인한다.
6. 이벤트에 개인 식별 정보와 자유 입력값이 없는지 확인한다.
7. GTM 컨테이너를 게시한 뒤 GA4 Realtime에서 운영 트래픽을 확인한다.

## 공식 참고 자료

- [Next.js Third Party Libraries](https://nextjs.org/docs/app/guides/third-party-libraries)
- [Google Consent Mode 설정](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Consent Mode 개요](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [GA4 데이터 보관](https://support.google.com/analytics/answer/7667196)
