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

MEDIA-004는 운영 API에서 10대·20대 키워드와 최근 30일 제작 이력을 읽고, Gemini 구조화 응답으로 하나의 편집 계획을 만든다. 후보는 설명과 근거 영상이 있고 최신 크롤링 스냅샷이 72시간 이내인 데이터만 사용한다.

`media/.env.local`에 다음 값을 설정한다. Cloudflare Access가 API를 보호하는 운영 환경에서는 service token 두 값도 함께 설정한다. 실제 키, 토큰과 운영 API 인증값은 Git에 커밋하지 않는다.

```bash
TRENDZIP_API_BASE_URL=https://api-trendzip.nadoran.com
MEDIA_OPERATIONS_API_KEY=
CLOUDFLARE_ACCESS_CLIENT_ID=
CLOUDFLARE_ACCESS_CLIENT_SECRET=
GEMINI_API_KEY=
```

운영 API와 Gemini를 호출하지 않고 전체 코드 계약을 확인하려면 다음 명령을 사용한다.

```bash
npm test
npm run typecheck
```

중복 정책은 동일 콘텐츠 `BLOCK`, 활성 동일 사건 `BLOCK`, 최근 동일 주제 `HOLD`, 그 외 `ALLOW` 순서로 판정한다. `REJECTED`, `RETIRED` 이력은 동일 콘텐츠 hash가 아닌 사건·주제 판정에서는 제외한다.

`npm run draft:prepare`는 중복 정책이 `ALLOW`인 경우에만 운영 API에 `DRAFT`를 예약한다. 생성된 검토 manifest는 `out/operational-drafts/{contentHash}.json`에 저장된다. `HOLD` 또는 `BLOCK`이면 예약과 파일 생성을 하지 않고 종료 코드 `2`를 반환한다. 이 단계에서는 TTS, 영상 렌더링과 게시를 실행하지 않는다.

정책, 라이선스와 후속 판단은 [`docs/media-shortform-spike.md`](../docs/media-shortform-spike.md)를 따른다.
TTS 선택과 비용 경계는 [`docs/media-tts-spike.md`](../docs/media-tts-spike.md)를 따른다.
운영 후보와 중복 판정 기준은 [`docs/media-publishing-policy.md`](../docs/media-publishing-policy.md)를 따른다.
