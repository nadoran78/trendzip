# 백엔드 개발 컨벤션

## 목적

이 문서는 백엔드 구현과 코드 리뷰에서 반복적으로 적용할 세부 개발 규칙을 관리한다.
프로젝트 구조와 기술 스택은 `backend/AGENTS.md`를 따르고, 구체적인 코드 작성 기준은 이 문서에 추가한다.

## 적용 원칙

- 새 규칙은 실제로 반복되는 문제를 해결하거나 코드 일관성을 높이는 경우에만 추가한다.
- 규칙에는 적용 기준과 예외를 함께 작성해 불필요한 추상화를 방지한다.
- 기존 코드 전체를 즉시 변경하지 않고, 관련 기능을 수정하는 작업부터 점진적으로 적용한다.
- 서로 다른 계층의 책임을 섞는 방향으로 편의를 제공하지 않는다.

## DTO 변환

### 기본 원칙

- Service 메서드에서는 조회, 정책 실행, 결과 조립의 흐름이 DTO 생성 코드에 가려지지 않게 한다.
- 필드가 많거나 중첩 컬렉션이 포함된 객체 변환은 `toXxxResponse()` 형태의 변환 함수로 분리한다.
- 한 파일에서만 사용하는 변환 함수는 해당 파일의 `private` 최상위 확장 함수로 작성한다.
- 동일한 변환이 둘 이상의 Service에서 재사용될 때만 별도 mapper 파일 또는 공용 변환 함수로 분리한다.
- 변환 함수는 순수한 데이터 변환만 담당하며 Repository 호출, 외부 API 호출, 비즈니스 판단을 포함하지 않는다.
- 필드가 적고 서비스 흐름을 방해하지 않는 단순 변환까지 일률적으로 분리하지 않는다.

### 권장 예시

```kotlin
fun getKeyword(id: Long): KeywordResponse {
    val keyword = keywordRepository.findById(id)
        ?: throw MzTrendException(ErrorCode.NOT_FOUND)
    val videos = videoRepository.findByKeywordId(id).map { it.toVideoResponse() }

    return keyword.toKeywordResponse(videos)
}

private fun KeywordQueryResult.toKeywordResponse(
    videos: List<VideoResponse>,
): KeywordResponse =
    KeywordResponse(
        id = id,
        word = word,
        videos = videos,
    )
```

### 피해야 할 예시

```kotlin
fun getKeyword(id: Long): KeywordResponse =
    KeywordResponse(
        id = id,
        videos =
            videoRepository.findByKeywordId(id).map {
                VideoResponse(
                    id = it.id,
                    title = it.title,
                    channelName = it.channelName,
                    thumbnailUrl = it.thumbnailUrl,
                )
            },
    )
```

객체 생성과 하위 컬렉션 변환이 Service 본문에 길게 중첩되면 처리 흐름을 파악하기 어렵다.

### 리뷰 체크리스트

- Service 메서드만 읽어도 처리 순서와 주요 의도가 드러나는가?
- DTO 생성자의 필드 나열이 조회나 비즈니스 흐름을 가리고 있지 않은가?
- 변환 함수가 데이터 변환 이외의 책임을 가지고 있지 않은가?
- 한 번만 사용하는 변환을 불필요하게 공용 mapper로 분리하지 않았는가?

## Service와 트랜잭션

### 기본 원칙

- 비즈니스 단위의 DB 조회와 쓰기는 Service 계층에 트랜잭션 경계를 설정한다.
- 공개 메서드가 모두 조회 전용인 Service는 클래스에 `@Transactional(readOnly = true)`를 적용한다.
- 조회와 쓰기 메서드가 함께 있는 Service는 조회 메서드에만 `@Transactional(readOnly = true)`를 적용한다.
- 쓰기 작업은 `@Transactional`을 사용하고 읽기 전용 트랜잭션으로 실행하지 않는다.
- DB를 사용하지 않는 단순 계산이나 외부 API 호출 전용 Service에는 불필요한 트랜잭션을 추가하지 않는다.
- Repository나 Controller가 아닌 Service 계층에서 트랜잭션 범위를 관리한다.
- 외부 API 호출과 트랜잭션 저장 서비스를 조율하는 오케스트레이션 Service에는 전체 트랜잭션을 적용하지 않는다.
- 오케스트레이션 중 여러 조회 결과의 원자적 일관성이 필요하지 않다면 Repository의 기본 읽기 트랜잭션을 사용할 수 있다.
- 조회 결과의 일관성이 비즈니스 요구사항인 경우에만 별도 조회 Service와 읽기 전용 트랜잭션을 도입한다.
- 실행 이력이나 외부 API 로그처럼 본 작업의 롤백과 무관하게 보존해야 하는 기록은 `REQUIRES_NEW`를 사용할 수 있다.

### 리뷰 체크리스트

- 조회 전용 Service에 `@Transactional(readOnly = true)`가 적용되어 있는가?
- 조회와 쓰기가 혼합된 Service에서 트랜잭션 속성이 메서드 역할에 맞게 구분되어 있는가?
- 쓰기 작업이 읽기 전용 트랜잭션 안에서 실행되고 있지 않은가?
- DB를 사용하지 않는 처리에 불필요한 트랜잭션이 적용되어 있지 않은가?
- 트랜잭션이 외부 API 응답이나 rate limit 대기 시간까지 불필요하게 유지되고 있지 않은가?
- 오케스트레이션 Service에 불필요한 전체 트랜잭션이 적용되어 있지 않은가?
- 독립적으로 보존해야 하는 기록이 상위 트랜잭션에 참여하고 있지 않은가?

## 향후 확장 대상

반복되는 문제가 확인되면 다음 항목의 컨벤션을 이 문서에 추가한다.

- Controller와 API DTO
- Repository와 조회 모델
- 예외 처리
- 테스트 작성
