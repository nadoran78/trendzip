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

MEDIA-004는 운영 API에서 10대·20대 키워드와 최근 30일 제작 이력을 읽고 하나의 편집 초안을 만든다. 후보는 설명과 근거 영상이 있고 최신 크롤링 스냅샷이 72시간 이내인 데이터만 사용한다. 보호된 키워드 상세 API는 영상의 `channelId`, 설명과 태그를 근거 선택용으로 제공한다. Gemini 1차 호출은 후보·편집 형식·사건 유형·관계 키워드와 영상 메타데이터의 원문 발췌만 선택한다. 기존 키워드 설명은 선정용 `contextSummary`일 뿐 사실 근거가 아니다.

애플리케이션은 1차 선택을 검증된 fact card와 Editorial Brief로 바꾸고, 선택 근거에서 직접 확인되지 않는 관련 키워드는 제거한다. 2차 Gemini 작성기는 이 Brief만 입력받아 문안을 작성한다. 작성 결과는 길이, 근거 ID, 내부 지표·세대 반응 주장, 근거 없는 수치와 긍정·부정 반응 단정을 검사한다. 계약 위반만 한 번 보정하며 HTTP 오류나 최종 검증 실패 시 기존 결정적 composer 결과를 fallback으로 사용하고 검토 경고를 남긴다.

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

결과는 `out/operational-dry-runs/`에 JSON으로 저장된다. 동일 입력에 대한 후보·`topicKey` 일관성과 시스템 생성 `eventKey`를 비교할 때는 2단계 Gemini 생성을 세 번 순차 실행한다.

```bash
MEDIA_DRY_RUN_COUNT=3 npm run draft:dry-run
```

반복 실행 사이에는 기본 3.5초 간격을 두며 `MEDIA_DRY_RUN_INTERVAL_MS`로 조정할 수 있다. 후보와 최근 이력은 한 번만 조회하고 모든 반복에서 동일한 입력을 사용한다. dry-run은 `reserveDraft()`를 호출하지 않는다. 보고서 v5는 반복별 최종 selection·근거·`finalDraft`, 작성 진단, 중복 판정과 콘텐츠 hash만 기록한다. 선택 보정과 작성 fallback·실패 상세는 실제 발생한 반복에만 추가하며 중간 `factCards`, `editorialBrief`, `writerDraft`와 전체 `manifestPreview`는 중복 저장하지 않는다. `topicKey`는 정규화한 키워드 hash로, `eventKey`는 `topicKey`, 최종 편집 형식과 크롤링 실행 ID로 생성하므로 문구 변화에 영향을 받지 않는다. 선택기의 후보 밖 ID·원문 불일치와 작성기의 복구 가능한 계약 위반은 각각 `MEDIA_GEMINI_REPAIR_DELAY_MS` 뒤 한 번만 보정한다. 작성 단계가 실패해도 검증 입력 기반 fallback으로 초안을 계속 만들며 `EDITORIAL_WRITER_FALLBACK` 경고와 실패 진단을 남긴다. 단계 진단은 `SELECTION`, `FACT_ASSEMBLY`, `BRIEF_ASSEMBLY`, `WRITING`, `WRITER_VALIDATION`, `COMPOSITION`, `DUPLICATE_POLICY`를 사용한다. 출처·관련 키워드 제거·형식 fallback·작성 fallback 경고는 사람 검수용이며 예약을 자동 차단하지 않는다.

`npm run draft:prepare`는 중복 정책이 `ALLOW`인 경우에만 운영 API에 `DRAFT`를 예약한다. 생성된 검토 manifest는 `out/operational-drafts/{contentHash}.json`에 저장된다. `HOLD` 또는 `BLOCK`이면 예약과 파일 생성을 하지 않고 종료 코드 `2`를 반환한다. 이 단계에서는 TTS, 영상 렌더링과 게시를 실행하지 않는다.

## 운영 TTS·렌더·사람 검수

MEDIA-005는 예약된 manifest v4 하나를 불변 입력으로 사용한다. TTS는 Gemini 비용이 발생하므로 명시적으로 실행하고, 기본 출력 디렉터리는 콘텐츠 ID와 실행 시각으로 격리한다.

```bash
npm run tts:operational -- out/operational-drafts/<content-hash>.json
```

명령이 출력한 실행 디렉터리에는 원본 `source-manifest.json`, 장면별 WAV와 `tts/audio-manifest.json`이 생성된다. 일부 장면 생성이 실패하면 임시 디렉터리를 제거하고 완성 실행으로 노출하지 않는다. 같은 경로를 덮어쓰지 않으므로 실패한 실행 뒤에는 새 명령을 실행한다.

기존 음성을 사용해 MP4, 대표 장면과 render manifest를 만든다. 이 단계는 Gemini API를 호출하지 않는다.

```bash
npm run render:operational -- out/operational-renders/<content-id>/<run-directory>
```

렌더가 성공하면 다음 결과가 같은 실행 디렉터리에 남는다.

- `video.mp4`: 1080x1920, 30fps, H.264·AAC 검수본
- `stills/*.png`: 장면별 대표 프레임 다섯 개
- `render-props.json`: 실제 음성 길이로 계산한 Remotion 입력
- `render-manifest.json`: 원본, 음성, props, MP4, 대표 장면 hash와 TTS·영상 규격

렌더 중 실패하면 임시 MP4, 대표 장면과 props를 제거한다. 완성된 `render-manifest.json`이 있는 실행은 덮어쓰지 않는다. 파일을 바꿔 재렌더하려면 새 실행 디렉터리를 만들고 TTS부터 다시 생성한다.

운영 백엔드에 V8 migration이 배포된 뒤 검수 대상을 등록한다. 등록 명령은 모든 파일 hash와 ffprobe 메타데이터를 다시 확인한 후 API를 호출하며 콘텐츠를 `REVIEW_REQUIRED`로 전환한다.

```bash
npm run draft:register -- out/operational-renders/<content-id>/<run-directory>
```

등록 후에는 `video.mp4` 전체와 대표 장면을 사람이 확인한다. 발음·속도·음량, 장면 전환·자막 싱크·겹침, 두 이유와 근거, CTA와 AI 제작 보조 공개를 모두 확인하기 전에는 결정을 기록하지 않는다.

```bash
npm run draft:review -- out/operational-renders/<content-id>/<run-directory> \
  --decision=APPROVED \
  --reviewer=operator \
  --reason="전체 영상과 근거를 확인했습니다."
```

`--decision`은 `APPROVED`, `NEEDS_REVISION`, `REJECTED` 중 하나다. 검수자와 사유는 필수이며 등록된 최신 아티팩트 hash가 아니면 결정할 수 없다. `NEEDS_REVISION`은 같은 대본으로 음성·렌더를 다시 만들 때 사용한다. 대본이나 근거를 고쳐야 하면 기존 hash를 수정하지 말고 MEDIA-004에서 새 `DRAFT`를 생성한다. 이전 렌더와 검수 결정은 DB에 보존한다.

테스트와 CI는 가짜 TTS client와 임시 파일을 사용하며 Gemini API나 운영 등록·검수 API를 호출하지 않는다. `GEMINI_API_KEY`, `MEDIA_OPERATIONS_API_KEY`와 Cloudflare service token은 `.env.local`에만 두고 manifest나 로그에 기록하지 않는다. 승인 명령은 자동 파이프라인에 포함하지 않는다.

정책, 라이선스와 후속 판단은 [`docs/media-shortform-spike.md`](../docs/media-shortform-spike.md)를 따른다.
TTS 선택과 비용 경계는 [`docs/media-tts-spike.md`](../docs/media-tts-spike.md)를 따른다.
운영 후보와 중복 판정 기준은 [`docs/media-publishing-policy.md`](../docs/media-publishing-policy.md)를 따른다.
