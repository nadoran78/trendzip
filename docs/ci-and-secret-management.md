# CI와 비밀정보 관리

## 목적

pull request와 `develop` push에서 동일한 통합 검증을 실행하고, API 키·토큰·개인키가 Git 이력에 포함되기 전에 차단한다. CI는 검증만 담당하며 배포는 별도 workflow와 운영 절차로 분리한다. 맥미니 배포는 로컬 수동 절차를 유지하고, Vercel 프론트엔드는 `main`에서 수동 실행하는 별도 workflow를 사용한다.

## GitHub Actions CI

workflow는 `.github/workflows/ci.yml`에 있다.

- 실행 조건: 모든 pull request, `develop` 브랜치 push
- 권한: 저장소 내용 읽기만 허용
- `Secret scan`: 전체 Git 이력을 Gitleaks로 검사
- `Full verification`: 비밀정보 검사가 성공한 뒤 `./dev/verify --full` 실행
- 중복 실행: 같은 브랜치에 새 변경이 올라오면 이전 실행 취소
- 외부 액션: major 태그가 아닌 검증한 전체 커밋 SHA로 고정

전체 검증은 Java 17과 Node.js 24를 사용하고, frontend dependency 설치 후 로컬 Docker Compose의 PostgreSQL을 시작한다. 실제 YouTube, 네이버 DataLab, Gemini API는 호출하지 않는다.

GitHub 저장소의 Ruleset 또는 Branch protection에서 `develop`에 다음 status check를 필수로 설정한다.

- `Secret scan`
- `Full verification`

액션 버전을 올릴 때는 공식 저장소의 release와 태그를 확인하고 전체 커밋 SHA와 옆의 버전 주석을 함께 변경한다.

프론트엔드 production 배포 workflow와 Secret 설정은 [Vercel 프론트엔드 수동 배포](ops/frontend-deployment.md)를 따른다.

## 로컬 비밀정보 검사

전체 Git 이력을 검사한다.

```bash
./dev/check-secrets
# 또는
./dev/check-secrets --all
```

커밋할 변경만 검사한다.

```bash
./dev/check-secrets --staged
```

`--staged`는 Git index 전체를 임시 디렉터리에 checkout하고 Gitleaks `dir` 모드로 검사한다. 로컬 실행 파일과 Docker fallback 모두 snapshot에 포함된 `.gitleaks.toml`을 사용한다. working tree의 unstaged 변경과 Git 비추적 파일은 포함하지 않으며, 일반 저장소와 linked worktree에서 같은 방식으로 동작한다. 임시 snapshot은 검사 성공·실패와 관계없이 종료할 때 제거한다.

`--all`은 Gitleaks `git` 모드로 전체 이력을 검사한다. Docker fallback에서는 linked worktree의 `.git` 파일이 가리키는 Git common directory도 읽을 수 있어야 한다. Git metadata 접근 오류나 `fatal: not a git repository`가 발생하면 비밀정보가 없다는 성공 결과로 처리하지 않는다.

검사는 `.gitleaks.toml`과 Gitleaks `8.30.1`을 사용한다. 같은 버전의 로컬 실행 파일이 있으면 직접 사용하고, 없거나 버전이 다르면 digest까지 고정한 공식 Docker 이미지를 사용한다. Docker 방식을 처음 사용할 때는 이미지 다운로드가 필요하고 Docker Desktop이 실행 중이어야 한다.

```bash
docker pull ghcr.io/gitleaks/gitleaks:v8.30.1
```

비밀정보 검사 회귀 테스트는 실제 프로젝트 index를 수정하지 않고 임시 Git 저장소와 linked worktree에서 실행한다.

```bash
./dev/tests/check-secrets --staged-only
./dev/tests/check-secrets --all
```

테스트용 Gitleaks 규칙과 합성 문자열을 사용해 clean snapshot은 통과하고 staged·committed 합성 비밀정보는 차단되는지 확인한다.

## Pre-commit 훅

저장소 훅을 한 번 활성화한다.

```bash
git config core.hooksPath .githooks
```

커밋할 때 `.githooks/pre-commit`이 staged 변경의 비밀정보를 먼저 검사한다. 백엔드 Kotlin 파일이 포함되면 기존 `ktlintCheck`도 이어서 실행한다.

`--no-verify`로 로컬 훅을 우회할 수 있으므로 pre-commit만 보안 경계로 간주하지 않는다. GitHub Actions의 전체 이력 검사를 최종 방어선으로 유지한다.

## 저장소 파일 규칙

- 실제 `.env`와 `.env.*` 파일은 커밋하지 않는다.
- `.env.example`, `.env.*.example`에는 빈 값, 로컬 개발값 또는 명백한 placeholder만 둔다.
- 인증서, 개인키, keystore, service account credential과 `secrets/` 디렉터리는 `.gitignore`에서 제외한다.
- GitHub Actions가 비밀정보를 필요로 하게 되면 workflow에 직접 쓰지 않고 GitHub Actions secret을 사용한다.
- 토큰이나 키를 문서, 이슈, 로그, 테스트 fixture에 실제 값으로 남기지 않는다.
- Gitleaks 오탐은 원인을 확인한 뒤 최소 범위만 `.gitleaks.toml` 또는 `.gitleaksignore`에 예외 처리한다. 파일 전체나 광범위한 경로를 먼저 제외하지 않는다.

## GitHub 저장소 보안 설정

GitHub 저장소의 `Settings`에서 secret scanning과 push protection을 사용할 수 있으면 모두 활성화한다. 해당 기능을 사용할 수 없는 저장소 요금제나 소유 형태라면 Gitleaks CI를 필수 status check로 유지한다.

GitHub Actions 기본 권한은 읽기 전용으로 설정하고, workflow별 `permissions`도 필요한 최소 권한만 선언한다. 현재 CI는 `contents: read` 외 권한이 필요하지 않다.

## 비밀정보 발견 시 대응

1. 커밋과 push를 중단한다.
2. 노출된 키나 토큰을 제공자 콘솔에서 먼저 폐기하고 새 값으로 발급한다.
3. 로컬 파일을 `.gitignore` 대상 경로로 옮기고 예시 파일에는 placeholder만 남긴다.
4. 아직 push하지 않은 커밋이면 Git 이력에서 값을 제거한 뒤 전체 검사를 다시 실행한다.
5. 이미 원격에 push했다면 새 값 발급을 완료한 후 저장소 관리자와 이력 정리 범위를 결정한다. 공유 브랜치의 이력을 임의로 강제 변경하지 않는다.
6. `./dev/check-secrets --all`과 GitHub Actions가 모두 통과하는지 확인한다.

비밀정보는 Git 이력에서 문자열을 지워도 이미 복제되었을 수 있으므로, 이력 정리보다 폐기와 재발급이 우선이다.
