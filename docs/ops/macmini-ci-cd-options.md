# Mac Mini CI/CD Options

이 문서는 Trendzip 맥미니 배포를 나중에 GitHub Actions로 자동화할 때 검토할 후보를 정리한다.

현재 운영 기준은 `macmini-deployment.md`의 로컬 수동 배포다. 이 문서의 workflow 예시는 바로 활성화하지 않고, CI/CD를 다시 설정할 때 참고한다.

## 1. 후보 요약

우선순위:

```text
1순위: Mac mini self-hosted runner
2순위: Tailscale 기반 VPN 배포
보류: 직접 WireGuard 구성
```

선택 기준:

```text
self-hosted runner
  - GitHub Actions job이 맥미니에서 직접 실행됨
  - SSH, 공인 IP, 포트포워딩, VPN이 필요 없음
  - 개인 맥미니 한 대에 Docker compose로 배포하는 현재 구조에 가장 단순함

Tailscale
  - GitHub-hosted runner가 Tailscale 네트워크에 접속한 뒤 맥미니로 SSH 배포
  - Tailscale은 WireGuard 기반이지만 key/peer/ACL 관리를 쉽게 해줌
  - 여러 서버나 private network 리소스가 생기면 확장성이 좋음

직접 WireGuard
  - 네트워크 학습에는 좋지만 GitHub-hosted runner에서 매번 wg 설정이 필요함
  - peer/private key 관리와 디버깅 부담이 Tailscale보다 큼
```

## 2. 1순위: Mac Mini Self-Hosted Runner

### 2.1 구조

```text
GitHub Actions
  |
  | job runs on Mac mini
  v
Mac mini self-hosted runner
  |
  | docker build / docker push
  v
GHCR
  |
  | docker-compose pull/up locally
  v
Trendzip backend
```

이 방식에서는 GitHub-hosted runner가 맥미니에 접속하지 않는다. workflow 자체가 맥미니에서 실행되므로 `docker-compose`도 로컬 명령으로 실행한다.

### 2.2 맥미니 설정 절차

GitHub repository에서 runner를 추가한다.

```text
Repository
  -> Settings
  -> Actions
  -> Runners
  -> New self-hosted runner
```

맥미니가 Apple Silicon이면 다음 조합을 선택한다.

```text
OS: macOS
Architecture: ARM64
```

맥미니에서는 GitHub가 보여주는 명령을 그대로 실행한다.

설치 위치 예시:

```bash
mkdir -p ~/actions-runner/trendzip
cd ~/actions-runner/trendzip
```

runner 설정 시 label 예시:

```text
self-hosted
macOS
ARM64
macmini
trendzip
prod
```

초기 연결 테스트:

```bash
./run.sh
```

서비스 등록:

```bash
cd ~/actions-runner/trendzip
./svc.sh install
./svc.sh start
./svc.sh status
```

### 2.3 사전 조건

맥미니에 다음이 준비되어 있어야 한다.

```text
Docker 실행 환경
docker-compose
GHCR pull용 ~/.docker-headless/config.json
~/apps/trendzip/docker-compose.prod.yml
~/apps/trendzip/backend/.env.prod
macmini-proxy Docker network
```

이미지 push는 workflow에서 `GITHUB_TOKEN` 또는 별도 `GHCR_TOKEN`으로 로그인한다.

### 2.4 배포 workflow 예시

파일 예시:

```text
.github/workflows/deploy-backend-self-hosted.yml
```

```yaml
name: Deploy Backend On Mac Mini

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag to build and deploy. Defaults to the commit SHA."
        required: false
        type: string

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: [self-hosted, macOS, ARM64, macmini, trendzip]

    env:
      IMAGE_NAME: ghcr.io/nadoran78/trendzip-backend
      IMAGE_TAG: ${{ inputs.image_tag || github.sha }}
      PROD_TAG: prod

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push backend image
        env:
          PUSH_IMAGE: "true"
          TAG_PROD: "true"
        run: scripts/ops/build-push-backend.sh

      - name: Deploy backend locally
        env:
          BACKEND_IMAGE: ghcr.io/nadoran78/trendzip-backend:prod
        run: |
          export DOCKER_CONFIG="$HOME/.docker-headless"
          cd ~/apps/trendzip
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml ps
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=120 backend
```

주의:

- self-hosted runner에서는 `deploy-macmini.sh`가 필수는 아니다. 이미 맥미니 안에서 실행되므로 compose 명령을 직접 실행하는 편이 단순하다.
- public repository에서 self-hosted runner를 사용할 때는 untrusted PR이 runner에서 코드를 실행하지 않도록 workflow trigger를 제한해야 한다.
- 수동 실행만 허용하려면 `workflow_dispatch`만 둔다.

### 2.5 롤백 workflow 예시

파일 예시:

```text
.github/workflows/rollback-backend-self-hosted.yml
```

```yaml
name: Rollback Backend On Mac Mini

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Previously pushed image tag to deploy."
        required: true
        type: string

permissions:
  contents: read
  packages: read

jobs:
  rollback:
    runs-on: [self-hosted, macOS, ARM64, macmini, trendzip]

    steps:
      - name: Rollback backend locally
        env:
          BACKEND_IMAGE: ghcr.io/nadoran78/trendzip-backend:${{ inputs.image_tag }}
        run: |
          export DOCKER_CONFIG="$HOME/.docker-headless"
          cd ~/apps/trendzip
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d backend
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml ps
          docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=120 backend
```

## 3. 2순위: Tailscale 기반 VPN 배포

### 3.1 구조

```text
GitHub-hosted runner
  |
  | Tailscale 접속
  v
Tailnet
  |
  | SSH to Mac mini Tailscale IP
  v
Mac mini
  |
  | docker-compose pull/up
  v
Trendzip backend
```

Tailscale은 WireGuard 기반 VPN이다. 직접 WireGuard peer를 구성하는 대신 Tailscale OAuth client와 ACL로 접속을 관리한다.

### 3.2 사전 조건

필요한 것:

```text
맥미니에 Tailscale 설치 및 로그인
맥미니 Tailscale IP 또는 MagicDNS 이름
GitHub Actions용 Tailscale OAuth client
맥미니 SSH 접속용 key
맥미니 GHCR pull용 ~/.docker-headless/config.json
```

GitHub secrets 예시:

```text
TS_OAUTH_CLIENT_ID
TS_OAUTH_SECRET
MACMINI_HOST          # 예: 100.x.y.z 또는 macmini.tailnet-name.ts.net
MACMINI_PORT          # 보통 22
MACMINI_USER
MACMINI_SSH_KEY
GHCR_USERNAME
GHCR_TOKEN
```

### 3.3 배포 workflow 예시

파일 예시:

```text
.github/workflows/deploy-backend-tailscale.yml
```

```yaml
name: Deploy Backend Through Tailscale

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag to build and deploy. Defaults to the commit SHA."
        required: false
        type: string

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      IMAGE_NAME: ghcr.io/nadoran78/trendzip-backend
      IMAGE_TAG: ${{ inputs.image_tag || github.sha }}
      PROD_TAG: prod

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ secrets.GHCR_USERNAME }}
          password: ${{ secrets.GHCR_TOKEN }}

      - name: Build and push backend image
        env:
          PUSH_IMAGE: "true"
          TAG_PROD: "true"
        run: scripts/ops/build-push-backend.sh

      - name: Connect to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:github-actions

      - name: Prepare SSH key
        run: |
          mkdir -p ~/.ssh
          printf '%s\n' "${{ secrets.MACMINI_SSH_KEY }}" > ~/.ssh/macmini_deploy_key
          chmod 600 ~/.ssh/macmini_deploy_key

      - name: Deploy backend to Mac mini
        env:
          MACMINI_HOST: ${{ secrets.MACMINI_HOST }}
          MACMINI_PORT: ${{ secrets.MACMINI_PORT }}
          MACMINI_USER: ${{ secrets.MACMINI_USER }}
          SSH_KEY_PATH: ~/.ssh/macmini_deploy_key
          BACKEND_IMAGE: ghcr.io/nadoran78/trendzip-backend:prod
          SYNC_COMPOSE: "false"
        run: scripts/ops/deploy-macmini.sh
```

주의:

- 이 방식에서는 `deploy-macmini.sh`를 재사용한다.
- `MACMINI_HOST`는 집 내부 IP가 아니라 Tailscale IP 또는 MagicDNS 이름이어야 한다.
- GitHub-hosted runner가 Docker image를 빌드하므로 runner 아키텍처는 기본적으로 linux/amd64다. 맥미니가 arm64 이미지를 요구하면 buildx multi-platform 구성이 필요할 수 있다.

### 3.4 롤백 workflow 예시

파일 예시:

```text
.github/workflows/rollback-backend-tailscale.yml
```

```yaml
name: Rollback Backend Through Tailscale

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Previously pushed image tag to deploy."
        required: true
        type: string

permissions:
  contents: read
  packages: read

jobs:
  rollback:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Connect to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_SECRET }}
          tags: tag:github-actions

      - name: Prepare SSH key
        run: |
          mkdir -p ~/.ssh
          printf '%s\n' "${{ secrets.MACMINI_SSH_KEY }}" > ~/.ssh/macmini_deploy_key
          chmod 600 ~/.ssh/macmini_deploy_key

      - name: Rollback backend on Mac mini
        env:
          MACMINI_HOST: ${{ secrets.MACMINI_HOST }}
          MACMINI_PORT: ${{ secrets.MACMINI_PORT }}
          MACMINI_USER: ${{ secrets.MACMINI_USER }}
          SSH_KEY_PATH: ~/.ssh/macmini_deploy_key
          BACKEND_IMAGE: ghcr.io/nadoran78/trendzip-backend:${{ inputs.image_tag }}
          SYNC_COMPOSE: "false"
        run: scripts/ops/deploy-macmini.sh
```

## 4. 직접 WireGuard 구성 메모

직접 WireGuard를 쓰면 GitHub-hosted runner에서 매번 다음 단계를 수행해야 한다.

```text
wireguard 설치
GitHub secret의 wg0.conf 복원
wg-quick up wg0
맥미니 VPN IP로 SSH 배포
wg-quick down wg0
```

workflow 흐름 예시:

```yaml
- name: Install WireGuard
  run: |
    sudo apt-get update
    sudo apt-get install -y wireguard

- name: Connect WireGuard
  run: |
    printf '%s' "${{ secrets.WG_CONFIG }}" | sudo tee /etc/wireguard/wg0.conf > /dev/null
    sudo chmod 600 /etc/wireguard/wg0.conf
    sudo wg-quick up wg0

- name: Deploy
  env:
    MACMINI_HOST: 10.0.0.2
    MACMINI_USER: leejungchang
  run: scripts/ops/deploy-macmini.sh

- name: Disconnect WireGuard
  if: always()
  run: sudo wg-quick down wg0
```

현재 우선순위에서 직접 WireGuard를 보류하는 이유:

- GitHub runner용 peer key 관리가 필요하다.
- VPN route, allowed IP, 방화벽, DNS 디버깅 포인트가 늘어난다.
- Tailscale이 같은 WireGuard 기반 연결을 더 적은 운영 부담으로 제공한다.

## 5. 현재 결정

현재는 CI/CD workflow를 활성화하지 않는다.

운영 기준:

```text
로컬 개발 머신에서 scripts/ops/build-push-backend.sh 실행
로컬 개발 머신에서 scripts/ops/deploy-macmini.sh 실행
```

CI/CD를 도입할 때는 먼저 self-hosted runner 방식을 검토한다.
