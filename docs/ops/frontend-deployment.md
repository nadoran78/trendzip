# Vercel 프론트엔드 수동 배포

## 목적

Trendzip 프론트엔드는 Vercel에 배포하지만 Git push와 배포를 분리한다. 운영 배포는 GitHub Actions의 `Deploy Frontend` workflow를 `main` 브랜치에서 수동 실행할 때만 수행하는 것을 목표로 한다.

이번 구성은 프론트엔드만 대상으로 한다. 맥미니 백엔드 배포, Cloudflare Access 적용과 배포 롤백 자동화는 별도 작업으로 관리한다.

## 배포 흐름

```text
develop에서 구현 및 CI 검증
        ↓
main 반영
        ↓
GitHub Actions > Deploy Frontend > Run workflow
        ↓
lint 및 typecheck
        ↓
Vercel production 설정 동기화 및 build
        ↓
Vercel production 배포
        ↓
배포 URL과 trendzip.nadoran.com smoke test
```

workflow 파일은 `.github/workflows/deploy-frontend.yml`이다.

Vercel 프로젝트의 Root Directory가 `frontend`로 설정되어 있으므로 `npm ci`, lint와 typecheck만 `frontend`에서 실행한다. `vercel pull`, `vercel build`, `vercel deploy`는 저장소 루트에서 실행해야 Vercel이 Root Directory를 한 번만 적용한다.

## 안전장치

- `workflow_dispatch` 외에는 배포를 시작하지 않는다.
- `main` 브랜치에서 실행한 경우에만 deploy job이 동작한다.
- GitHub Environment `production-frontend`에 배포 Secret을 격리한다.
- workflow 권한은 저장소 내용 읽기만 허용한다.
- 같은 production 배포는 한 번에 하나만 실행하며 진행 중인 배포를 새 실행이 취소하지 않는다.
- Vercel CLI 버전을 workflow에 고정한다.
- 배포 전 lint와 TypeScript 검사를 수행한다.
- 배포 후 Vercel 배포 URL과 커스텀 도메인의 랜딩 및 10대 피드 경로를 확인한다.

## GitHub Environment 준비

GitHub 저장소에서 다음 순서로 Environment를 만든다.

1. `Settings > Environments`로 이동한다.
2. `New environment`를 선택한다.
3. 이름을 `production-frontend`로 지정한다.
4. Deployment branches 또는 Deployment branches and tags에서 `main`만 허용한다.
5. Environment secrets에 아래 세 값을 등록한다.

| Secret | 용도 |
|---|---|
| `VERCEL_TOKEN` | GitHub Actions가 Vercel CLI를 인증할 때 사용하는 토큰 |
| `VERCEL_ORG_ID` | `nadoran-lab` Vercel 팀 식별자 |
| `VERCEL_PROJECT_ID` | Trendzip Vercel 프로젝트 식별자 |

실제 값은 저장소 파일, workflow, 문서 또는 GitHub Variable에 기록하지 않는다.

### Vercel 값 확인

`VERCEL_TOKEN`은 Vercel 계정의 Token 설정에서 만들고 Trendzip 프로젝트를 소유한 팀에 접근할 수 있는 범위로 발급한다.

`VERCEL_PROJECT_ID`는 Trendzip 프로젝트의 `Settings > General`에서 확인한다. `VERCEL_ORG_ID`는 Vercel 팀 설정의 Team ID를 사용한다. 로컬에서 Vercel 프로젝트를 link한 경우 `frontend/.vercel/project.json`의 `projectId`, `orgId`로도 확인할 수 있지만 이 파일은 Git에 커밋하지 않는다.

## Cloudflare Access 서비스 인증

운영 API 전체를 Cloudflare Access로 보호한 뒤에는 사용자 브라우저가 아니라 Vercel의 Next.js 서버만 서비스 토큰으로 API를 호출한다.

```text
사용자 브라우저
  -> Vercel Next.js 서버
  -> Cloudflare Access
  -> Cloudflare Tunnel
  -> Caddy
  -> Spring Boot
```

Vercel 프로젝트의 Production 환경변수에 다음 값을 등록한다.

| 환경변수 | 용도 |
|---|---|
| `API_BASE_URL` | `https://api-trendzip.nadoran.com` 운영 API 주소 |
| `CLOUDFLARE_ACCESS_CLIENT_ID` | Vercel production 전용 Access Service Token Client ID |
| `CLOUDFLARE_ACCESS_CLIENT_SECRET` | Vercel production 전용 Access Service Token Client Secret |

두 Access 환경변수는 서버 전용이며 `NEXT_PUBLIC_` 접두사를 사용하지 않는다. 실제 값은 GitHub Secret, 저장소 파일, 문서와 로그에 중복 기록하지 않고 Vercel Production 환경에서 관리한다. `vercel pull --environment=production`이 build에 필요한 운영 설정을 가져오므로 배포 workflow Secret에 별도로 추가할 필요가 없다.

Access를 처음 적용할 때는 다음 순서를 지켜 API 차단 시간을 만들지 않는다.

1. Cloudflare에서 Vercel production 전용 Service Token을 생성한다.
2. Vercel Production 환경변수에 Client ID와 Client Secret을 등록한다.
3. Access 헤더를 추가하는 프론트 코드를 production에 배포한다.
4. 랜딩, 피드, 랭킹과 키워드 상세가 기존 공개 API에서 정상인지 확인한다.
5. Cloudflare Access에서 `api-trendzip.nadoran.com/*` Self-hosted application을 만든다.
6. `Service Auth` 정책에 해당 Service Token만 포함한다.
7. 인증 없는 직접 API 호출이 거부되고 프론트 사용자 흐름은 정상인지 확인한다.

`Everyone`, `Bypass`, `Any Access Service Token` 정책은 사용하지 않는다. `/api/health`, Swagger와 OpenAPI도 같은 호스트 정책으로 보호한다.

## 최초 수동 배포

Git 자동 배포를 끄기 전에 수동 workflow가 정상 동작하는지 먼저 확인한다.

1. workflow 변경을 `main`에 반영한다.
2. GitHub 저장소의 `Actions`로 이동한다.
3. 왼쪽 목록에서 `Deploy Frontend`를 선택한다.
4. `Run workflow`에서 브랜치를 `main`으로 선택한다.
5. `Run workflow`를 실행한다.
6. 모든 step이 성공했는지 확인한다.
7. workflow Summary의 Vercel 배포 URL을 연다.
8. `https://trendzip.nadoran.com`의 랜딩, 피드, 랭킹과 키워드 상세 흐름을 확인한다.

다른 브랜치를 선택하면 workflow 자체는 시작될 수 있지만 deploy job은 실행되지 않고 `skipped` 처리된다.

## Git 자동 배포 비활성화

최초 수동 배포 성공을 확인한 뒤 `frontend/vercel.json`에 다음 설정을 적용했다.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": false
  }
}
```

이 설정은 GitHub 연동을 해제하지 않고 모든 브랜치의 Git push 자동 배포만 중지한다. Vercel CLI를 사용하는 `Deploy Frontend` workflow에는 영향을 주지 않는다.

설정 반영 후에는 다음 항목을 확인한다.

1. `develop` push로 Preview deployment가 자동 생성되지 않는다.
2. `main` 반영으로 Production deployment가 자동 생성되지 않는다.
3. `Deploy Frontend` workflow를 `main`에서 수동 실행하면 Production이 갱신된다.

Git 자동 배포를 복구해야 하면 `frontend/vercel.json`의 `git.deploymentEnabled`를 `true`로 변경하거나 해당 설정을 제거한다.

## 배포 후 확인

workflow는 아래 네 URL에 HTTP 성공 응답이 오는지 검사한다.

```text
<Vercel deployment URL>/
<Vercel deployment URL>/feed/teen
https://trendzip.nadoran.com/
https://trendzip.nadoran.com/feed/teen
```

커스텀 도메인 연결이 늦게 반영될 수 있어 smoke test는 일정 간격으로 재시도한다. 배포 자체는 성공했지만 smoke test가 실패했다면 Vercel deployment 상태, 커스텀 도메인 alias와 운영 API 응답을 순서대로 확인한다.

## 문제 해결

### deploy job이 skipped인 경우

workflow 실행 브랜치가 `main`인지 확인한다.

### Missing required GitHub Environment secret

`production-frontend` Environment 이름과 세 Secret 이름이 정확한지 확인한다. Repository secret에만 등록했다면 Environment secret으로 옮긴다.

### Vercel 프로젝트를 찾지 못하는 경우

`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`가 현재 `nadoran-lab`의 Trendzip 프로젝트 값인지 확인한다. 토큰이 해당 팀에 접근 가능한지도 확인한다.

### frontend/frontend/package.json을 찾는 경우

Vercel 프로젝트의 Root Directory `frontend`가 두 번 적용된 상태다. Vercel CLI 단계에 `working-directory: frontend`가 없는지 확인한다. 프론트 검증 명령과 달리 Vercel CLI는 저장소 루트에서 실행한다.

### build는 성공했지만 smoke test가 실패하는 경우

Vercel 로그에서 서버 컴포넌트의 `API_BASE_URL` 설정과 운영 API 응답을 확인한다. `API_BASE_URL`은 Vercel 프로젝트의 Production 환경변수로 관리하며 GitHub Actions Secret으로 중복 저장하지 않는다.

### Cloudflare Access 활성화 후 API 요청이 실패하는 경우

Vercel Production 환경에 두 Access 환경변수가 모두 설정됐는지 확인하고 환경변수 등록 이후 프론트를 다시 배포했는지 확인한다. Cloudflare Access application의 보호 hostname과 `Service Auth` 정책이 `api-trendzip.nadoran.com/*`, Vercel production 전용 Service Token을 정확히 가리키는지도 확인한다. 한쪽 자격 증명만 설정되면 프론트 API client가 설정 오류를 발생시킨다.

## 롤백

이번 작업에는 롤백 workflow를 포함하지 않는다. 긴급한 경우 Vercel Dashboard에서 이전 정상 production deployment를 확인해 복구하고, 배포가 안정화된 뒤 이전 deployment를 선택적으로 승격하는 수동 롤백 workflow를 별도 구현한다.

Cloudflare Access 적용 직후 프론트 전체가 API 인증 오류로 동작하지 않으면 Access application을 일시적으로 비활성화해 공개 API 경로를 복구한다. 원인을 수정하고 프론트를 재배포한 다음 정책을 다시 활성화한다. 프론트가 보내는 Access 헤더는 Access application이 비활성화된 동안에도 기존 Spring Boot API 동작에 영향을 주지 않는다.
