# Trendzip Media Spike

Trendzip 키워드를 9:16 숏폼 MP4로 렌더링할 수 있는지 검증하는 독립 모듈이다. 첫 샘플은 운영 DB와 외부 미디어 자산을 사용하지 않는다.

## 실행

Node.js 24 환경에서 의존성을 설치한다.

```bash
npm ci
```

샘플 영상을 렌더링하고 출력 규격을 검사한다.

```bash
npm run render:sample
```

결과는 `out/made-in-korea.mp4`에 생성되며 Git에 포함되지 않는다. 렌더 명령은 `ffprobe-static`으로 다음 조건을 확인한다.

- 1080x1920
- 30fps
- 첫 템플릿의 고정 길이 36초
- H.264, yuv420p MP4
- 첫 스파이크에서 의도한 무음 출력

브라우저에서 장면을 조정할 때는 Studio를 사용한다.

```bash
npm run studio
```

사람 검수용 대표 장면 PNG 다섯 장을 생성한다.

```bash
npm run stills:sample
```

결과는 `out/stills/`에 생성되며 Git에 포함되지 않는다.

## TTS 스파이크

MEDIA-002는 기존 Gemini 결제 계정의 TTS Preview 모델을 사용한다. `media/.env.example`을 참고해 Git에 포함되지 않는 `media/.env.local`에 API 키를 설정한다.

```bash
cp .env.example .env.local
npm run tts:sample
```

기본 모델은 `gemini-3.1-flash-tts-preview`, 음성은 `Kore`다. 다음 환경변수로 로컬 실행 설정을 바꿀 수 있다.

```bash
GEMINI_TTS_MODEL=
GEMINI_TTS_VOICE=
GEMINI_TTS_STYLE=
GEMINI_TTS_REQUEST_INTERVAL_MS=3500
```

장면별 WAV와 `audio-manifest.json`은 `out/tts/`에 생성되며 Git에 포함되지 않는다. API 호출 없이 코드를 확인하려면 다음 명령을 사용한다.

```bash
npm test
npm run typecheck
```

manifest의 음성 길이, 장면 여백과 최소 길이로 계산한 timeline은 다음 명령으로 확인한다.

```bash
npm run timeline:sample
```

TTS 생성 후 narrated MP4와 장면별 대표 PNG를 렌더링한다.

```bash
npm run render:narrated
npm run stills:narrated
```

결과는 각각 `out/made-in-korea-narrated.mp4`, `out/narrated-stills/`에 생성된다. 렌더 전에 fixture 대본 hash, manifest와 WAV 파일 크기가 일치하는지 확인한다. 렌더 후에는 동적 영상 길이, H.264·yuv420p 영상과 단일 AAC 오디오 스트림을 `ffprobe-static`으로 검사한다.

기존 TTS를 재사용해 타입, 테스트, narrated 렌더와 대표 장면 생성을 한 번에 검증할 수 있다. 이 명령은 Gemini API를 호출하지 않는다.

```bash
npm run verify:narrated
```

최종 MP4는 기술 검증용이며 발음, 음량, 장면 전환과 자막 동기화를 사람이 확인하기 전에는 게시하지 않는다.

## 운영 초안 준비

MEDIA-004는 운영 API에서 10대·20대 키워드와 최근 30일 제작 이력을 읽고 하나의 편집 초안을 만든다. 후보는 설명과 근거 영상이 있고 최신 크롤링 스냅샷이 72시간 이내인 데이터만 사용한다. Gemini는 후보·편집 형식·관계 키워드와 영상 메타데이터의 원문 발췌만 선택한다. 애플리케이션은 선택 결과를 검증된 fact card로 바꾸고 제목·훅·요약·이유·내레이션을 길이 제한 안에서 결정적으로 조립한다. 기존 키워드 설명은 선정용 `contextSummary`일 뿐 사실 근거가 아니다.

`media/.env.local`에 다음 값을 설정한다. Cloudflare Access가 API를 보호하는 운영 환경에서는 service token 두 값도 함께 설정한다. 실제 키, 토큰과 운영 API 인증값은 Git에 커밋하지 않는다.

```bash
TRENDZIP_API_BASE_URL=https://api-trendzip.nadoran.com
MEDIA_OPERATIONS_API_KEY=
CLOUDFLARE_ACCESS_CLIENT_ID=
CLOUDFLARE_ACCESS_CLIENT_SECRET=
GEMINI_API_KEY=
MEDIA_GEMINI_REPAIR_DELAY_MS=3500
MEDIA_DRY_RUN_COUNT=1
MEDIA_DRY_RUN_INTERVAL_MS=3500
```

운영 API와 Gemini를 호출하지 않고 전체 코드 계약을 확인하려면 다음 명령을 사용한다.

```bash
npm test
npm run typecheck
```

중복 정책은 동일 콘텐츠 `BLOCK`, 활성 동일 사건 `BLOCK`, 최근 동일 주제 `HOLD`, 그 외 `ALLOW` 순서로 판정한다. `REJECTED`, `RETIRED` 이력은 동일 콘텐츠 hash가 아닌 사건·주제 판정에서는 제외한다.

DB 예약 없이 현재 후보, Gemini 선택 결과와 시스템 조립 문안을 확인하려면 dry-run을 사용한다.

```bash
npm run draft:dry-run
```

결과는 `out/operational-dry-runs/`에 JSON으로 저장된다. 동일 입력에 대한 후보·`topicKey` 일관성과 시스템 생성 `eventKey`를 비교할 때는 Gemini를 세 번 순차 호출한다.

```bash
MEDIA_DRY_RUN_COUNT=3 npm run draft:dry-run
```

반복 호출 사이에는 기본 3.5초 간격을 두며 `MEDIA_DRY_RUN_INTERVAL_MS`로 조정할 수 있다. 후보와 최근 이력은 한 번만 조회하고 모든 반복에서 동일한 입력을 사용한다. dry-run은 `reserveDraft()`를 호출하지 않는다. 보고서 v3은 반복별 `selection`, `factCards`, `systemDraft`, `reviewWarnings`와 `manifestPreview`를 기록한다. `topicKey`는 정규화한 키워드 hash로, `eventKey`는 `topicKey`, 편집 형식과 크롤링 실행 ID로 생성하므로 문구 변화에 영향을 받지 않는다. 후보 밖 키워드·영상 ID 또는 영상 메타데이터에 없는 발췌만 `MEDIA_GEMINI_REPAIR_DELAY_MS` 뒤 한 번 보정하며, 같은 잘못된 선택이 반복되면 `REPAIR_NO_EFFECT`로 기록한다. 실패 단계는 `SELECTION`, `FACT_ASSEMBLY`, `COMPOSITION`, `DUPLICATE_POLICY` 중 하나로 남는다. `reviewWarnings`는 클릭 유도형 제목, 30일이 지난 근거와 주제 불일치를 사람 검수용으로 알리지만 예약을 자동 차단하지 않는다. `WHY_NOW`의 기존 `evidenceDiagnostics`도 최근 30일 근거 여부를 별도로 기록한다.

`npm run draft:prepare`는 중복 정책이 `ALLOW`인 경우에만 운영 API에 `DRAFT`를 예약한다. 생성된 검토 manifest는 `out/operational-drafts/{contentHash}.json`에 저장된다. `HOLD` 또는 `BLOCK`이면 예약과 파일 생성을 하지 않고 종료 코드 `2`를 반환한다. 이 단계에서는 TTS, 영상 렌더링과 게시를 실행하지 않는다.

정책, 라이선스와 후속 판단은 [`docs/media-shortform-spike.md`](../docs/media-shortform-spike.md)를 따른다.
TTS 선택과 비용 경계는 [`docs/media-tts-spike.md`](../docs/media-tts-spike.md)를 따른다.
운영 후보와 중복 판정 기준은 [`docs/media-publishing-policy.md`](../docs/media-publishing-policy.md)를 따른다.
