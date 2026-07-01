# Mac Mini Deployment Guide

이 문서는 MZ 따라잡기 백엔드를 맥미니에 배포하기 위한 운영 구조와 절차를 정리한다.

현재 목표는 맥미니에 공용 진입점 인프라와 프로젝트별 런타임을 분리해서 운영하는 것이다. Cloudflare Tunnel은 macOS host service로 실행하고, Caddy는 Docker infra compose에서 내부 reverse proxy 역할만 담당한다. Trendzip compose는 `backend + PostgreSQL + Redis`만 담당한다.

## 배포 원칙

- 외부 HTTPS는 Cloudflare가 담당한다.
- 공유기에서 `80`, `443` 포트포워딩을 열지 않는다.
- Caddy는 맥미니 내부 reverse proxy로 사용한다.
- Cloudflare Tunnel은 Docker compose가 아니라 macOS host service로 실행한다.
- Docker infra compose에는 Caddy만 둔다.
- PostgreSQL과 Redis는 외부에 직접 공개하지 않는다.
- DB 접속은 SSH 터널링으로 한다.
- 운영 환경변수는 git에 커밋하지 않는다.
- 맥미니는 애플리케이션 소스를 빌드하지 않고, registry에서 검증된 이미지를 pull해서 실행한다.
- 이미지는 commit SHA 태그와 환경 태그를 같이 사용한다.
- 여러 프로젝트를 올릴 수 있도록 공용 infra와 앱 compose를 분리한다.

## 목표 구조

```text
Build/Release path
------------------
GitHub
  |
  | manual workflow_dispatch
  v
GitHub Actions
  |
  | scripts/ops/build-push-backend.sh -> push image
  v
GitHub Container Registry
  |
  | scripts/ops/deploy-macmini.sh -> SSH -> docker-compose pull
  v
Mac mini

Runtime traffic path
--------------------
api-trendzip.nadoran.com
  |
  | HTTPS
  v
Cloudflare
  |
  | Cloudflare Tunnel
  v
Mac mini: host service
  |
  +-- cloudflared
        |
        +-- http://localhost:8080
              |
              v
        Mac mini: infra compose
              |
              +-- caddy
                    |
                    +-- http://trendzip-backend:8080

Mac mini: trendzip compose
  |
  +-- backend
  +-- postgres
  +-- redis
```

## 1. 맥미니 공용 인프라와 프로젝트 분리

맥미니에는 공용 infra 디렉터리와 프로젝트 디렉터리를 나눠 둔다.

```text
~/apps/infra
  docker-compose.yml
  Caddyfile

~/apps/trendzip
  docker-compose.prod.yml
  backend/.env.prod
```

`infra`는 여러 프로젝트가 공유하는 외부 진입점이다.

```text
infra compose
  - caddy
```

`cloudflared`는 `infra` compose 안에 넣지 않고, Homebrew로 설치한 macOS service로 실행한다.

`trendzip`은 프로젝트별 런타임이다.

```text
trendzip compose
  - backend
  - postgres
  - redis
```

이렇게 나누면 Trendzip을 재배포해도 Cloudflare Tunnel과 Caddy는 건드리지 않아도 된다. 다른 프로젝트를 추가할 때도 `infra/Caddyfile`에 라우팅만 추가하면 된다. Docker daemon이 재시작되더라도 Cloudflare Tunnel 프로세스는 Docker와 분리해서 관리할 수 있다.

## 2. Docker 네트워크 전략

공용 reverse proxy 네트워크를 하나 만든다.

```bash
docker network create macmini-proxy
```

역할:

```text
macmini-proxy
  - infra/caddy
  - trendzip/backend
  - future-project/backend
```

Trendzip compose에서는 `backend`만 `macmini-proxy`에 붙인다. `postgres`, `redis`는 Trendzip compose 내부 네트워크에만 둔다.

```text
macmini-proxy
  +-- caddy
  +-- trendzip-backend

trendzip internal network
  +-- backend
  +-- postgres
  +-- redis
```

이 구조의 장점:

- Caddy는 backend만 볼 수 있다.
- PostgreSQL과 Redis는 Caddy/Tunnel에서 접근할 필요가 없다.
- 프로젝트별 DB와 Redis를 독립적으로 유지할 수 있다.
- 여러 프로젝트를 추가해도 외부 진입점은 `infra` 하나로 유지된다.

## 3. 맥미니에서 먼저 해야 할 일

### 3.1 macOS 기본 설정

- 맥미니가 절전 모드로 들어가지 않게 설정한다.
- 전원 연결과 네트워크 연결을 안정적으로 유지한다.
- 가능하면 Wi-Fi보다 유선 LAN을 사용한다.
- macOS 방화벽을 켜고 필요한 inbound만 허용한다.

Cloudflare Tunnel을 쓰면 앱 서비스용 `80`, `443` 포트포워딩은 필요 없다. SSH 관리 접속만 열면 된다.

### 3.2 고정 내부 IP 설정

공유기 관리자 페이지에서 맥미니에 고정 내부 IP를 할당한다.

예시:

```text
Mac mini internal IP: 192.168.0.20
```

이 IP는 로컬 SSH 접속이나 필요 시 SSH 포트포워딩에 사용한다.

### 3.3 SSH 활성화

맥미니에서 SSH를 켠다.

```text
System Settings
  -> General
  -> Sharing
  -> Remote Login ON
```

개발 머신에서 SSH key를 등록한다.

```bash
ssh-copy-id macmini-user@192.168.0.20
```

`ssh-copy-id`가 없다면 개발 머신의 공개키를 맥미니의 `~/.ssh/authorized_keys`에 추가한다.

```bash
cat ~/.ssh/id_ed25519.pub
```

맥미니에서:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
vi ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

접속 확인:

```bash
ssh macmini-user@192.168.0.20
```

운영 안정화 후에는 `/etc/ssh/sshd_config`에서 비밀번호 로그인 비활성화를 검토한다.

```text
PasswordAuthentication no
PubkeyAuthentication yes
```

설정 변경 후 SSH 재접속이 되는지 반드시 별도 터미널에서 확인한다.

### 3.4 Docker 설치

맥미니에 Docker 실행 환경을 설치한다.

선택지는 둘 중 하나로 시작하면 된다.

- Docker Desktop
- OrbStack

처음에는 익숙한 Docker Desktop으로 시작해도 충분하다. 이후 여러 프로젝트를 많이 띄우게 되면 OrbStack 같은 대안을 검토한다.

설치 확인:

```bash
docker version
docker-compose version
```

### 3.5 배포 디렉터리 생성

맥미니에 공용 infra 디렉터리와 Trendzip 디렉터리를 만든다.

```bash
mkdir -p ~/apps/infra
mkdir -p ~/apps/trendzip/backend
```

공용 Docker 네트워크도 최초 1회 생성한다.

```bash
docker network create macmini-proxy
```

이미 존재하면 에러가 날 수 있다. 이 경우 무시해도 된다.

### 3.6 Docker registry 로그인

이 문서는 GitHub Container Registry, 즉 GHCR 기준으로 정리한다.

맥미니에서 GHCR에 로그인한다.

```bash
docker login ghcr.io
```

입력값:

```text
Username: <github-username>
Password: <github-personal-access-token>
```

Personal Access Token에는 최소한 package pull 권한이 필요하다.

```text
read:packages
```

private package를 사용할 경우 repository 접근 권한도 확인한다.

## 4. Cloudflare와 cloudflared 설정

도메인은 Cloudflare에서 구매한 `nadoran.com`을 사용한다.

Trendzip API 주소:

```text
api-trendzip.nadoran.com
```

Cloudflare Zero Trust에서 Tunnel을 만든다.

권장 방식:

```text
Tunnel
  -> Public Hostname
       Hostname: api-trendzip.nadoran.com
       Service:  http://localhost:8080
```

이 방식에서는 Cloudflare가 외부 HTTPS를 담당하고, Tunnel 이후 맥미니 내부에서는 HTTP로 Caddy에 전달한다.

`cloudflared`를 Homebrew로 설치한다.

```bash
brew install cloudflared
```

Cloudflare dashboard가 보여주는 macOS 명령을 기준으로 tunnel service를 설치한다. 보통 다음 형태다.

```bash
sudo cloudflared service install <tunnel-token>
```

Cloudflare가 표시하는 정확한 명령을 우선한다. token 값은 shell history나 문서에 남기지 않는다.

서비스 상태 확인:

```bash
ps aux | grep '[c]loudflared'
sudo launchctl list | grep cloudflared
sudo launchctl print system/com.cloudflare.cloudflared
```

Cloudflare dashboard의 Tunnel 상태가 `Healthy`로 보이고, `launchctl`에서 `com.cloudflare.cloudflared`가 실행 중이면 정상이다.

Homebrew service 대신 Cloudflare가 설치한 launchd service로 동작하는 경우에도 운영 관점은 같다. `cloudflared`는 Docker compose가 아니라 macOS host process로 관리한다.

host에서 실행되는 `cloudflared`는 Docker network 안의 `caddy:80` 이름을 직접 알 수 없다. 그래서 Caddy container는 맥미니 loopback에만 포트를 열고, Cloudflare Tunnel service URL은 `http://localhost:8080`을 사용한다.

```text
cloudflared host service
  -> http://localhost:8080
  -> Caddy container
```

## 5. Infra Compose

공용 infra compose는 `caddy`만 담당한다.

파일 위치:

```text
~/apps/infra/docker-compose.yml
~/apps/infra/Caddyfile
```

예상 compose 구조:

```yaml
name: macmini-infra

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - macmini-proxy

networks:
  macmini-proxy:
    external: true

volumes:
  caddy_data:
  caddy_config:
```

Cloudflare Tunnel을 사용하므로 `caddy`는 외부 인터페이스에 `80`, `443`을 publish하지 않는다. `127.0.0.1:8080:80`은 맥미니 내부 loopback에만 열리는 포트이며, host에서 실행되는 `cloudflared`가 Caddy에 접근하기 위한 로컬 엔드포인트다.

## 6. Caddy 라우팅

Caddy는 맥미니 내부 reverse proxy로만 동작한다.

파일 위치:

```text
~/apps/infra/Caddyfile
```

Trendzip API 라우팅:

```caddyfile
http://api-trendzip.nadoran.com {
	reverse_proxy trendzip-backend:8080
}
```

Cloudflare가 외부 HTTPS를 담당하므로 Caddy는 여기서 Let’s Encrypt 인증서를 직접 발급할 필요가 없다. HSTS 같은 public HTTPS 정책도 우선 Cloudflare 쪽에서 관리하는 편이 단순하다.

다른 프로젝트를 추가하면 같은 Caddyfile에 host block을 추가한다.

```caddyfile
http://api.other.nadoran.com {
	reverse_proxy other-backend:8080
}
```

Caddy 설정을 바꾼 뒤에는 infra compose에서 reload한다.

```bash
cd ~/apps/infra
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## 7. Trendzip Compose

Trendzip compose는 프로젝트 런타임만 담당한다.

서비스:

- `backend`
- `postgres`
- `redis`

`caddy`와 `cloudflared`는 Trendzip compose에 넣지 않는다.

`backend`는 두 네트워크에 붙는다.

- Trendzip 내부 network: `postgres`, `redis` 접근
- 공용 `macmini-proxy`: Caddy 접근

예상 구조:

```yaml
backend:
  image: ghcr.io/nadoran78/trendzip-backend:prod
  networks:
    default:
    macmini-proxy:
      aliases:
        - trendzip-backend

postgres:
  networks:
    - default

redis:
  networks:
    - default

networks:
  macmini-proxy:
    external: true
```

PostgreSQL은 운영 편의상 맥미니 로컬 인터페이스에만 publish할 수 있다.

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"
```

이렇게 하면 외부에서는 DB에 직접 접근할 수 없고, SSH 터널을 통해서만 접속할 수 있다.

## 8. 운영 환경변수

### 8.1 Trendzip env

파일 위치:

```text
~/apps/trendzip/backend/.env.prod
```

`backend/.env.prod.example`을 복사해서 실제 값을 채운다.

필수 값:

```env
SPRING_PROFILES_ACTIVE=prod

POSTGRES_URL=jdbc:postgresql://postgres:5432/mztrend
POSTGRES_USERNAME=mztrend
POSTGRES_DB=mztrend
POSTGRES_USER=mztrend
POSTGRES_PASSWORD=change-me

REDIS_URL=redis://redis:6379

YOUTUBE_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GEMINI_API_KEY=

APP_CRAWLING_SCHEDULER_ENABLED=true
APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=false
APP_CRAWLING_SCHEDULER_CRON=0 0 3 * * MON
APP_CRAWLING_SCHEDULER_ZONE=Asia/Seoul

GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_RATE_LIMIT_MAX_REQUESTS_PER_MINUTE=20
GEMINI_READ_TIMEOUT_SECONDS=120
GEMINI_MAX_EXPLAIN_KEYWORD_COUNT=20
```

`POSTGRES_PASSWORD=change-me`는 예시값이다. 맥미니에 복사한 뒤 반드시 실제 비밀번호로 바꾼다.

운영에서는 `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=false`를 기본으로 둔다. 컨테이너 재시작 때마다 외부 API 호출이 즉시 발생하는 것을 막기 위해서다.

## 9. 개발 머신과 GitHub에서 준비할 일

### 9.1 Docker image 빌드 준비

backend를 이미지로 만들 수 있어야 한다.

추가 예정 파일:

```text
backend/Dockerfile
.dockerignore
scripts/ops/build-push-backend.sh
```

이미지 이름 예시:

```text
ghcr.io/nadoran78/trendzip-backend
```

태그 전략:

```text
ghcr.io/nadoran78/trendzip-backend:<git-sha>
ghcr.io/nadoran78/trendzip-backend:prod
```

`<git-sha>`는 정확한 배포 버전을 추적하기 위한 태그이고, `prod`는 맥미니 compose가 기본으로 pull하는 운영 태그다.

### 9.2 공용 배포 스크립트 구성

GitHub Actions와 로컬 수동 배포가 같은 스크립트를 사용하도록 구성한다.

추가 예정 파일:

```text
scripts/ops/build-push-backend.sh
scripts/ops/deploy-macmini.sh
```

역할:

```text
build-push-backend.sh
  -> GitHub Actions runner 또는 로컬 개발 머신에서 실행
  -> Gradle 테스트
  -> Docker backend image build
  -> GHCR push

deploy-macmini.sh
  -> GitHub Actions runner 또는 로컬 개발 머신에서 실행
  -> SSH로 맥미니 접속
  -> ~/apps/trendzip에서 docker-compose pull/up 실행
  -> 배포 후 로그 또는 health check 확인
```

`deploy-macmini.sh`는 Trendzip compose만 재기동해야 한다. 공용 `infra` compose는 Caddyfile 변경이나 tunnel 변경이 있을 때만 별도로 재기동한다.

### 9.3 GitHub Actions 수동 배포 구성

`main` branch에 push될 때 자동 배포하지 않는다. GitHub Actions 화면에서 사람이 직접 실행하는 `workflow_dispatch` 방식으로 시작한다.

수동 workflow 실행 순서:

```text
checkout
setup JDK / Docker
login to GHCR
scripts/ops/build-push-backend.sh
scripts/ops/deploy-macmini.sh
```

추가 예정 파일:

```text
.github/workflows/deploy-backend.yml
```

GitHub workflow 권한:

```yaml
permissions:
  contents: read
  packages: write
```

GitHub Actions secrets:

```text
MACMINI_HOST
MACMINI_PORT
MACMINI_USER
MACMINI_SSH_KEY
GHCR_USERNAME
GHCR_TOKEN
```

`MACMINI_SSH_KEY`는 맥미니에 접속 가능한 private key다. 해당 public key는 맥미니의 `~/.ssh/authorized_keys`에 등록되어 있어야 한다.

## 10. 최초 배포 순서

### 10.1 공용 infra 최초 1회 배포

맥미니에서 `cloudflared` host service를 먼저 설정한다.

```bash
brew install cloudflared
sudo cloudflared service install <tunnel-token>
```

Cloudflare dashboard에서 Tunnel 상태가 `Healthy`인지 확인한다.

그다음 공용 Docker network를 만든다.

```bash
docker network create macmini-proxy
```

infra 파일을 배치한다.

```bash
cd ~/apps/infra
vi Caddyfile
vi docker-compose.yml
```

infra를 먼저 띄운다.

```bash
cd ~/apps/infra
docker-compose up -d
```

상태 확인:

```bash
ps aux | grep '[c]loudflared'
sudo launchctl list | grep cloudflared
docker-compose ps
docker-compose logs -f caddy
```

### 10.2 Trendzip 최초 배포

운영 파일을 맥미니로 보낸다.

```bash
scp docker-compose.prod.yml macmini-user@192.168.0.20:~/apps/trendzip/
ssh macmini-user@192.168.0.20 "mkdir -p ~/apps/trendzip/backend"
scp backend/.env.prod.example macmini-user@192.168.0.20:~/apps/trendzip/backend/.env.prod
```

맥미니에서 실제 운영 환경변수를 채우고, GHCR에 로그인한다.

```bash
cd ~/apps/trendzip
vi backend/.env.prod
docker login ghcr.io
```

compose 설정을 먼저 검증한다.

```bash
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml config
```

초기 설정 확인을 위해 맥미니에서 직접 pull/up을 실행할 수 있다.

```bash
cd ~/apps/trendzip
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d
```

컨테이너 상태 확인:

```bash
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml ps
```

로그 확인:

```bash
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs -f backend
```

DB 마이그레이션은 앱 시작 시 Flyway가 자동 실행되는 구조를 기본으로 한다.

## 11. 재배포 순서

재배포는 Trendzip 앱 compose만 대상으로 한다.

### 11.1 GitHub Actions 수동 배포

GitHub Actions 화면에서 `deploy-backend` workflow를 수동 실행한다.

실행 흐름:

```text
workflow_dispatch
  -> checkout
  -> setup JDK / Docker
  -> GHCR login
  -> scripts/ops/build-push-backend.sh
  -> scripts/ops/deploy-macmini.sh
```

맥미니 내부에서 실행되는 명령:

```bash
cd ~/apps/trendzip
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d backend
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=200 backend
```

### 11.2 Infra 변경 배포

Caddy 라우팅을 바꾼 경우:

```bash
cd ~/apps/infra
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Cloudflare Tunnel token이나 cloudflared 설정을 바꾼 경우에는 Cloudflare dashboard가 제공하는 명령으로 host service를 다시 설정한다.

```bash
sudo cloudflared service uninstall
sudo cloudflared service install <new-tunnel-token>
sudo launchctl list | grep cloudflared
```

## 12. 배포 후 검증

### 12.1 Cloudflare Tunnel 검증

```bash
ps aux | grep '[c]loudflared'
sudo launchctl list | grep cloudflared
sudo launchctl print system/com.cloudflare.cloudflared
```

Cloudflare dashboard에서 해당 tunnel이 `Healthy`인지 확인한다.

### 12.2 Infra Caddy 검증

```bash
cd ~/apps/infra
docker-compose ps
docker-compose logs --tail=200 caddy
```

Caddy가 host loopback에서 응답하는지 확인한다.

```bash
curl -H "Host: api-trendzip.nadoran.com" http://localhost:8080/api/health
```

공용 Docker network 확인:

```bash
docker network inspect macmini-proxy
```

`caddy`와 `trendzip-backend`가 같은 `macmini-proxy` 네트워크에 있어야 한다.

### 12.3 Trendzip 검증

```bash
cd ~/apps/trendzip
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml ps
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=200 backend
```

외부 헬스체크:

```bash
curl https://api-trendzip.nadoran.com/api/health
```

백엔드 API도 직접 호출한다.

```bash
curl "https://api-trendzip.nadoran.com/api/feed?generation=TEEN"
curl "https://api-trendzip.nadoran.com/api/keywords?generation=TEEN"
```

## 13. DB 접속 방식

운영 PostgreSQL은 직접 public publish하지 않는다.

Trendzip compose에서 PostgreSQL을 아래처럼 맥미니 local interface에만 열어 둔다.

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"
```

개발 머신에서 SSH 터널을 연다.

```bash
ssh -L 5433:localhost:5432 macmini-user@<home-public-ip>
```

SSH 포트 `22`를 외부에 열기 부담스럽다면 공유기 외부 포트를 다르게 열 수 있다.

```text
External 2222 -> 192.168.0.20:22
```

접속:

```bash
ssh -p 2222 -L 5433:localhost:5432 macmini-user@<home-public-ip>
```

로컬 DB 툴 접속 정보:

```text
Host: localhost
Port: 5433
Database: mztrend
User: mztrend
Password: <POSTGRES_PASSWORD>
```

SSH 터널 없이 맥미니 안에서 직접 확인할 수도 있다.

```bash
cd ~/apps/trendzip
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml exec postgres psql -U mztrend -d mztrend
```

## 14. DB 검증 SQL

최근 크롤링 실행:

```sql
select id, generation, status, started_at, completed_at, completed_at - started_at as elapsed
from trend_crawl_runs
order by started_at desc
limit 10;
```

세대별 키워드와 설명 수:

```sql
with latest_runs as (
    select distinct on (generation) id, generation, started_at
    from trend_crawl_runs
    order by generation, started_at desc
)
select
    lr.generation,
    count(tl.id) as trend_logs,
    count(distinct k.id) as keywords,
    count(distinct k.id) filter (
        where k.explain is not null and btrim(k.explain) <> ''
    ) as explained_keywords
from latest_runs lr
left join trend_logs tl on tl.crawl_run_id = lr.id
left join keywords k on k.id = tl.keyword_id
group by lr.generation
order by lr.generation;
```

활성 피드 개수:

```sql
select
    tfi.generation,
    tfi.feed_section,
    count(*) as items,
    count(distinct tfi.primary_keyword_id) as keywords,
    count(distinct tfi.trend_video_id) as videos
from trend_feed_items tfi
where tfi.is_active = true
group by tfi.generation, tfi.feed_section
order by tfi.generation, tfi.feed_section;
```

외부 API 실패 로그:

```sql
select id, provider, purpose, http_status, success, duration_ms, error_message, started_at
from external_api_logs
where started_at > now() - interval '24 hours'
  and not success
order by started_at desc;
```

Gemini 사용량:

```sql
select
    id,
    purpose,
    http_status,
    success,
    response_metadata ->> 'finishReason' as finish_reason,
    response_metadata #>> '{usageMetadata,totalTokenCount}' as total_tokens,
    started_at
from external_api_logs
where provider = 'GEMINI'
  and started_at > now() - interval '24 hours'
order by started_at desc;
```

## 15. 수동 크롤링

운영에서는 크롤링이 스케줄로 돌게 한다.

수동 실행 API나 CLI가 아직 없다면 다음 중 하나를 나중에 추가한다.

- 관리자용 내부 API
- Spring Boot actuator endpoint
- CLI runner
- 일시적으로 `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=true`로 실행 후 다시 false로 복구

마지막 방식은 외부 API 호출을 중복 발생시킬 수 있으므로 운영에서는 신중하게 사용한다.

## 16. 백업

맥미니에서 백업 디렉터리를 만든다.

```bash
mkdir -p ~/backups/trendzip/postgres
```

수동 백업:

```bash
cd ~/apps/trendzip
docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U mztrend -d mztrend \
  > ~/backups/trendzip/postgres/mztrend-$(date +%Y%m%d-%H%M%S).sql
```

최근 14일만 보관:

```bash
find ~/backups/trendzip/postgres -name "mztrend-*.sql" -mtime +14 -delete
```

자동화는 macOS `launchd`나 crontab 중 익숙한 방식으로 시작한다.

## 17. 운영 점검 루틴

매일 또는 배포 후 확인:

- infra 상태: `cd ~/apps/infra && docker-compose ps`
- tunnel 상태: `sudo launchctl list | grep cloudflared`
- Caddy 로그: `cd ~/apps/infra && docker-compose logs --tail=200 caddy`
- Trendzip 상태: `cd ~/apps/trendzip && docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml ps`
- 백엔드 로그: `cd ~/apps/trendzip && docker-compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=200 backend`
- 최근 크롤링 성공 여부
- 최근 외부 API 실패 여부
- 피드/키워드 개수
- 디스크 용량

디스크 용량:

```bash
df -h
docker system df
```

불필요한 Docker 캐시 정리는 신중하게 한다.

```bash
docker image prune
```

## 18. Cloudflare Tunnel을 쓰지 않는 대안

Cloudflare Tunnel을 쓰지 않는다면 예전처럼 공유기에서 `80`, `443`을 맥미니로 포워딩하고 Caddy가 직접 HTTPS 인증서를 발급하게 할 수 있다.

```text
Internet
  -> Router 80/443 port forwarding
  -> Mac mini Caddy
  -> backend
```

이 방식은 구조가 단순하지만 집 공인 IP, 포트포워딩, 인증서 발급, 보안 노출을 직접 관리해야 한다. 현재 목표 구조에서는 Cloudflare Tunnel을 기본 경로로 사용한다.

## 19. 다음 구현 TODO

문서화 이후 실제 코드/설정 작업은 다음 순서로 진행한다.

- `docker-compose.prod.yml`에서 `caddy` 제거
- `docker-compose.prod.yml`의 `backend`를 `macmini-proxy` external network에 연결
- `Caddyfile` 위치와 책임 재정리
- `backend/.env.prod.example`의 운영 URL/프로필 값 재검토
- `backend/Dockerfile` 추가
- `.dockerignore` 추가
- `scripts/ops/build-push-backend.sh` 추가
- `scripts/ops/deploy-macmini.sh` 추가
- `.github/workflows/deploy-backend.yml` 추가
- 백엔드 prod profile 필요 여부 확인
- 백업 스크립트 추가
- 반복 운영 명령을 `Makefile` 또는 추가 `scripts/ops` 스크립트로 정리
