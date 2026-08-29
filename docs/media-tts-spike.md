# 숏폼 TTS 및 오디오 동기화 기술 스파이크

## 목적

MEDIA-001의 무음 Remotion 샘플에 한국어 내레이션을 추가하고, 음성 길이에 맞춰 장면과 자막을 동적으로 배치할 수 있는지 검증한다. 운영 데이터, 승인 상태와 업로드는 다루지 않는다.

## 후보 비교

2026-08-19 공식 문서를 기준으로 비교했다.

| 후보 | 장점 | 제약 | 판단 |
|---|---|---|---|
| Gemini 3.1 Flash TTS Preview | 기존 Gemini API 키와 결제 계정 재사용, 한국어와 자연어 스타일 지시, 24kHz PCM 공식 예제 | Preview 모델과 비교적 제한적인 rate limit | 스파이크 선택 |
| Google Cloud Neural2·WaveNet | 안정된 제품군과 문자 단위 가격, 한국어 음성 제공 | 별도 Cloud TTS 설정과 인증 경로 필요 | 운영 대안 |
| Azure Speech | 다수의 `ko-KR` 음성과 24kHz·48kHz 출력 | 별도 Azure 리소스와 자격 증명 필요 | 품질 비교 대안 |

Gemini 3.1 Flash TTS의 유료 가격은 입력 텍스트 100만 토큰당 1달러, 출력 오디오 100만 토큰당 20달러이며 오디오 1초는 25토큰으로 계산된다. 36초 출력은 입력 비용을 제외하면 약 0.018달러다. Preview 모델은 변경될 수 있으므로 모델과 음성은 환경변수로 교체 가능하게 둔다.

공식 참고 자료:

- [Gemini TTS 생성](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini API 가격](https://ai.google.dev/gemini-api/docs/pricing)
- [Google Cloud Text-to-Speech 가격](https://cloud.google.com/text-to-speech/pricing?hl=ko)
- [Azure Speech 한국어 음성](https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts)

## 선택한 입력과 출력

- 모델: `gemini-3.1-flash-tts-preview`
- 음성: `Kore`
- 출력: mono, 24kHz, 16-bit PCM을 WAV 컨테이너로 저장
- 인증: 로컬 프로세스의 `GEMINI_API_KEY`
- 생성 위치: `media/out/tts/`
- 요청 간격: 환경변수로 설정하고 기본값은 3.5초로 둔다.

각 장면은 별도 요청으로 생성한다. `audio-manifest.json`에는 모델·음성·오디오 규격, 장면별 파일명·재생 시간과 대본 hash를 저장한다. fixture 대본과 hash가 다르면 기존 음성을 재사용하지 않는다.

## 비밀정보와 비용 경계

- API 키는 커맨드라인 인수, fixture, manifest와 로그에 기록하지 않는다.
- TTS 생성은 명시적인 `npm run tts:sample`에서만 실행한다.
- 테스트와 CI는 가짜 transport와 고정 manifest를 사용하고 Gemini API를 호출하지 않는다.
- 생성 중 일부 장면이 실패하면 완성된 manifest를 남기지 않는다.
- 첫 스파이크 결과물은 기술 검증용이며 공개 게시하지 않는다.

## 사용자 실습 경계

Codex는 장면별 duration을 가진 manifest, timeline 입력 타입, 호출부와 테스트를 준비했다. 사용자는 `calculateSceneTimeline()`에서 음성 시간을 프레임으로 변환하고 여백·최소 길이·연속 시작 시점을 구현했으며 전체 미디어 테스트를 통과시켰다.

## Remotion 통합

- Composition은 narrated props가 있으면 계산된 timeline으로 장면 시작 시점과 전체 길이를 결정한다.
- 각 WAV는 장면의 `audioFrom` 프레임부터 재생하고 같은 장면의 내레이션 문구를 하단 자막으로 표시한다.
- 무음 스파이크 props에는 timeline과 오디오 경로가 없으므로 기존 36초 무음 렌더를 유지한다.
- narrated 렌더 전 fixture 대본 hash, manifest, WAV 존재 여부와 파일 크기를 검증한다.
- narrated 렌더 후 1080x1920, 30fps, 동적 길이, H.264, yuv420p와 단일 AAC 오디오 스트림을 검사한다.
- 생성 음성은 `out/tts/`, narrated 영상은 `out/made-in-korea-narrated.mp4`, 대표 장면은 `out/narrated-stills/`에 저장하며 Git에 포함하지 않는다.

외부 API 없이 합성 톤 WAV로 27초 동적 Composition을 렌더해 AAC 오디오 스트림과 다섯 장면의 자막 배치를 확인했다. 이어 실제 Gemini TTS로 장면별 WAV를 생성하고 48.384초 H.264·AAC 영상과 대표 장면 다섯 장을 렌더했다. 사용자가 최종 영상을 재생해 실제 음성의 한국어 발음, 속도, 음량, 장면 전환과 자막 동기화를 확인하고 기술 검증용 결과물로 승인했다.

## 수동 품질 검수

1. `npm run tts:sample`로 실제 장면별 음성을 생성한다.
2. `npm run verify:narrated`로 테스트, 타입 검사, narrated MP4와 대표 장면을 생성한다.
3. 전체 MP4를 재생해 한국어 발음, 속도와 장면 사이의 무음을 확인한다.
4. 각 장면의 음성 시작과 하단 자막이 같은 맥락인지 확인한다.
5. 자막, 하단 날짜·도메인과 본문이 겹치거나 잘리지 않는지 확인한다.
6. 검수가 끝나기 전에는 결과물을 공개 게시하지 않는다.
