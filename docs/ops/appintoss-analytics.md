# 앱인토스 분석 및 광고 판단

## 목적

앱인토스 출시 후 실제 사용자 규모, 반복 이용과 핵심 콘텐츠 탐색을 확인해 광고 도입 여부를 판단한다. 이 문서는 사용자 지표와 Worker 운영 지표의 역할을 분리하고, 불필요한 외부 분석 도구·개인정보 수집을 피하는 기준을 정한다.

## 지표 책임

| 구분 | 기준 도구 | 확인 항목 | 사용 목적 |
|---|---|---|---|
| 사용자 규모·구성 | 앱인토스 콘솔 대시보드 | DAU, 세션, 리텐션, 유입경로, OS·성별·연령 분포 | 서비스 수요와 반복 이용 판단 |
| 핵심 행동 | 앱인토스 SDK 분석 이벤트 | 피드 로드, 세대 전환, 키워드 상세, 영상 재생 화면 진입 | 어떤 콘텐츠 흐름이 실제로 사용되는지 확인 |
| API 운영 안정성 | Cloudflare Worker Metrics·로그 | 요청, 오류, CPU, upstream 실패, cache hit, Free 한도 | 장애·비용·캐시 효율 점검 |

Worker 요청 수는 캐시, 재시도와 자동 호출을 포함할 수 있으므로 사용자 수·DAU·세션의 대체 지표로 사용하지 않는다. 광고 수익화 판단의 사용자 기준은 앱인토스 콘솔로 고정한다.

## 데이터 수집 한계

- 앱인토스 콘솔의 DAU·리텐션·유입경로는 실제 라이브 출시 후 수집한다. AIT Devtools·QR 테스트 데이터는 광고 판단에 사용하지 않는다.
- SDK 이벤트도 실제 출시 다음 날부터 콘솔에서 확인하는 것을 기준으로 한다. WebView SDK 3.x와 분석 API의 세부 호출 계약은 구현 직전에 SDK 3.x 공식 가이드와 콘솔에서 다시 확인한다.
- Cloudflare Worker Metrics는 배포 직후부터 운영 상태를 확인하는 용도이며, 개인별 행동·리텐션을 제공하지 않는다.

## 최소 이벤트 계약

초기 이벤트는 아래 다섯 개를 넘기지 않는다. 이벤트 API의 정확한 호출 방식은 WebView SDK 3.x 기준으로 구현한다.

| 이벤트 | 발생 조건 | 허용 파라미터 | 해석 제한 |
|---|---|---|---|
| `feed_loaded` | 피드 API가 성공하고 첫 목록을 표시 | `generation` | 단순 화면 진입이 아닌 정상 콘텐츠 로드 |
| `generation_changed` | 사용자가 세대를 전환 | `from_generation`, `to_generation` | 자동 기본 선택은 제외 |
| `keyword_detail_opened` | 키워드 상세 화면을 표시 | `generation`, `rank_bucket` | 키워드 원문·ID는 전송하지 않음 |
| `video_player_opened` | 내부 YouTube 재생 화면 또는 바텀시트를 열기 | `generation`, `source_screen` | 실제 재생 완료·시청 시간은 의미하지 않음 |
| `content_load_failed` | 사용자에게 오류 화면을 표시 | `screen`, `error_category` | 오류 원문·요청 URL·개인정보는 전송하지 않음 |

이벤트 파라미터에는 IP 주소, 사용자 식별자, 토큰, 원문 영상 제목, 키워드 원문, 전체 URL을 넣지 않는다. GTM·GA4는 앱인토스 번들에서 사용하지 않는다.

## 출시 후 4주 관찰

광고 없이 최소 4주간 아래 지표를 주 단위로 기록한다.

- 주간 중앙 DAU와 주간 증감
- D1·D7 리텐션
- 사용자당 세션 수와 세션 길이
- `feed_loaded` 대비 `keyword_detail_opened`, `video_player_opened` 비율
- 유입경로별 리텐션 차이
- Worker 오류율, cache hit, Free 한도 근접 여부

주간 기록은 앱인토스 콘솔의 집계 주기와 맞춰 다음 날 이후의 확정 데이터를 사용한다. Worker 오류가 급증한 주의 행동 이벤트는 사용자 관심 감소로 바로 해석하지 않는다.

## 광고 도입 결정 기준

광고 도입은 단일 DAU 숫자로 결정하지 않는다. 아래 네 항목을 함께 검토한다.

| 항목 | 광고 도입 검토 신호 | 보류 신호 |
|---|---|---|
| 반복 이용 | DAU와 D1·D7 리텐션이 여러 주 동안 유지 또는 상승 | 일회성 유입 뒤 급격한 이탈 |
| 콘텐츠 탐색 | 상세·영상 재생 화면 진입이 피드 로드와 함께 유지 | 피드 로드만 있고 핵심 행동이 낮음 |
| 운영 안정성 | Worker 오류와 API timeout이 낮고 Free 한도 여유가 있음 | 오류·한도 초과·캐시 미스가 반복됨 |
| 사용자 경험 | 핵심 콘텐츠를 방해하지 않는 광고 위치와 빈도를 설명할 수 있음 | 첫 화면·탐색 흐름을 방해할 가능성이 큼 |

검토 결과 광고 실험이 타당하면 광고 SDK, 배치, 빈도, 광고 노출·eCPM·리텐션 영향 분석을 별도 `APPINTOSS-AD-001` 작업으로 정의한다. 광고를 붙인 뒤에는 앱인토스 광고 분석의 노출 성공, viewable impression, eCPM과 리텐션 변화를 함께 비교한다.

## 제외 범위

- Workers Analytics Engine, Grafana, 별도 분석 DB
- GTM·GA4를 통한 앱인토스 사용자 추적
- 로그인·사용자 식별을 전제로 한 개인 단위 분석
- 광고 SDK·광고 배치·광고 수익 정산 구현

## 공식 자료

- [앱인토스 대시보드](https://developers-apps-in-toss.toss.im/analytics/dashboard.html)
- [앱인토스 이벤트 로깅](https://developers-apps-in-toss.toss.im/analytics/logging.html)
- [앱인토스 핵심 지표](https://developers-apps-in-toss.toss.im/analytics/conversion-metrics.html)
- [앱인토스 인앱 광고 분석](https://developers-apps-in-toss.toss.im/ads/intro.html)
- 앱인토스 콘솔 공지: WebView 프로젝트 SDK 3.x 업데이트 안내 (2026-08-18, 전환 마감 2026-09-14)
- [Cloudflare Workers Metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)

공식 자료 확인일: 2026-08-30. SDK·콘솔 분석·광고 정책은 구현과 출시 직전에 다시 확인한다.
