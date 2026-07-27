# 프론트엔드 디자인 기준

`design` 디렉토리의 시안은 프론트엔드 화면 구현의 기준이다. 프론트엔드 작업을 시작하기 전에 대상 경로와 연결된 JSX와 HTML을 모두 확인한다.

## 화면별 기준 파일

| 서비스 경로 | JSX 기준 | 브라우저 미리보기 |
|---|---|---|
| `/` | `design/app.jsx` | `design/trendzip.html` |
| `/feed/[generation]` | `design/feed.jsx` | `design/trendzip-feed.html` |
| `/trend/[generation]` | `design/trend.jsx` | `design/trendzip-trends.html` |
| `/keyword/[id]` | `design/keyword.jsx` | `design/trendzip-keyword.html` |

JSX는 레이아웃, 컴포넌트 구조, 색상과 상호작용의 기준이고 HTML은 390x844 브라우저 미리보기와 시각 비교에 사용한다. 실제 서비스 데이터와 URL 구조는 현재 API 계약과 Next.js 라우팅을 따른다.

## 구현에서 제외하는 요소

- `design/ios-frame.jsx`의 상태 표시줄, 다이내믹 아일랜드, 기기 테두리는 시안 확인용 프레임이므로 제품 UI에 구현하지 않는다.
- `design/tweaks-panel.jsx`와 각 시안의 `*Tweaks` 컴포넌트는 디자인 편집 도구이므로 제품 UI에 구현하지 않는다.
- mock 데이터, mock 조회수와 mock 날짜는 실제 API 응답으로 교체한다.
- 백엔드 또는 사용자 흐름이 아직 없는 버튼은 동작하는 것처럼 보이지 않게 비활성화하고 작업 문서에 차이를 기록한다.

## 작업 절차

1. `docs/work-items.md`의 활성 프론트엔드 작업에 `#### 디자인 기준`을 추가한다.
2. 상태를 `CONFIRMED`로 기록하고 이 문서에 정의된 `design/` 경로를 한 개 이상 명시한다.
3. 390x844 모바일 화면을 우선 구현하고 데스크톱에서도 콘텐츠가 깨지지 않는지 확인한다.
4. 완료 전 디자인 원본과 실제 화면을 비교하고 활성 작업의 `#### 검증`에 `- 디자인 검증: PASS`를 기록한다.
5. 의도적으로 다르게 구현한 항목과 이유를 작업 문서의 인계 메모에 남긴다.
