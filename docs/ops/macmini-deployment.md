# Mac Mini Deployment Guide

이 문서는 MZ 따라잡기 백엔드를 맥미니에 배포하기 위한 TODO와 운영 절차를 정리한다.

1차 목표는 Docker image registry에 올라간 backend 이미지를 맥미니에서 pull해서 `backend + PostgreSQL + Redis`를 Docker Compose로 안정적으로 실행하고, 프론트엔드가 호출할 수 있는 HTTPS API 주소를 만드는 것이다.

## 배포 원칙

- 외부 공개 포트는 가능하면 `80`, `443`, `22`만 사용한다.
- PostgreSQL과 Redis는 외부에 직접 공개하지 않는다.
- DB 접속은 SSH 터널링으로 한다.
- 운영 환경변수는 git에 커밋하지 않는다.
- 맥미니는 애플리케이션 소스를 빌드하지 않고, registry에서 검증된 이미지를 pull해서 실행한다.
- 이미지는 commit SHA 태그와 환경 태그를 같이 사용한다.
- 최초 배포는 단순하게 시작하고, 모니터링/자동화는 실제 운영 흐름이 생긴 뒤 보강한다.

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
  | scripts/ops/deploy-macmini.sh -> SSH -> docker compose pull
  v
Mac mini

Runtime traffic path
--------------------
Internet
  |
  | HTTPS
  v
Router
  |
  | 80/443 port forwarding
  v
Mac mini
  |
  +-- reverse proxy (Caddy or Nginx)
  |     |
  |     +-- api.example.com -> backend:8080
  |
  +-- Docker Compose network
        |
        +-- backend
        +-- postgres
        +-- redis
```

## 1. 맥미니에서 먼저 해야 할 일

### 1.1 macOS 기본 설정

- 맥미니가 절전 모드로 들어가지 않게 설정한다.
- 전원 연결과 네트워크 연결을 안정적으로 유지한다.
- 가능하면 Wi-Fi보다 유선 LAN을 사용한다.
- macOS 방화벽을 켜고 필요한 inbound만 허용한다.

### 1.2 고정 내부 IP 설정

공유기 관리자 페이지에서 맥미니에 고정 내부 IP를 할당한다.

예시:

```text
Mac mini internal IP: 192.168.0.20
```

이 IP는 공유기 포트포워딩과 SSH 접속에 사용한다.

### 1.3 SSH 활성화

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

### 1.4 Docker 설치

맥미니에 Docker 실행 환경을 설치한다.

선택지는 둘 중 하나로 시작하면 된다.

- Docker Desktop
- OrbStack

처음에는 익숙한 Docker Desktop으로 시작해도 충분하다. 이후 여러 프로젝트를 많이 띄우게 되면 OrbStack 같은 대안을 검토한다.

설치 확인:

```bash
docker version
docker compose version
```

### 1.5 배포 디렉터리 생성

맥미니에 배포용 디렉터리를 만든다.

```bash
mkdir -p ~/apps/trendzip
cd ~/apps/trendzip
```

registry 기반 배포에서는 맥미니에 전체 소스코드를 clone하지 않아도 된다. 맥미니에는 실행에 필요한 운영 파일만 있으면 된다.

필요한 파일:

```text
docker-compose.prod.yml
Caddyfile
backend/.env.prod
```

처음에는 개발 머신에서 운영 파일을 `scp`로 전송하는 방식이 단순하다.

```bash
scp docker-compose.prod.yml macmini-user@192.168.0.20:~/apps/trendzip/
scp Caddyfile macmini-user@192.168.0.20:~/apps/trendzip/
ssh macmini-user@192.168.0.20 "mkdir -p ~/apps/trendzip/backend"
scp backend/.env.prod.example macmini-user@192.168.0.20:~/apps/trendzip/backend/.env.prod
```

전송 후 맥미니에서 `backend/.env.prod`의 빈 값을 실제 운영 값으로 채운다.

운영 파일이 많아지면 별도의 deploy repository를 만들거나, 이 repository에서 `ops` 관련 파일만 checkout하는 방식으로 바꾼다.

### 1.6 Docker registry 로그인

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

## 2. 개발 머신과 GitHub에서 준비할 일

### 2.1 Docker image 빌드 준비

backend를 이미지로 만들 수 있어야 한다.

추가 예정 파일:

```text
backend/Dockerfile
.dockerignore
scripts/ops/build-push-backend.sh
```

이미지 이름 예시:

```text
ghcr.io/<github-owner>/trendzip-backend
```

태그 전략:

```text
ghcr.io/<github-owner>/trendzip-backend:<git-sha>
ghcr.io/<github-owner>/trendzip-backend:prod
```

`<git-sha>`는 정확한 배포 버전을 추적하기 위한 태그이고, `prod`는 맥미니 compose가 기본으로 pull하는 운영 태그다.

### 2.2 공용 배포 스크립트 구성

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
  -> 맥미니 안에서 docker compose pull/up 실행
  -> 배포 후 로그 또는 health check 확인
```

이 구조의 핵심은 GitHub Actions와 로컬 배포가 서로 다른 명령을 갖지 않게 하는 것이다.

### 2.3 GitHub Actions 수동 배포 구성

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

### 2.4 로컬 수동 빌드/푸시

GitHub Actions를 거치지 않고 로컬 개발 머신에서 직접 이미지 빌드와 push를 수행할 수도 있다.

예시:

```bash
export GHCR_USERNAME=<github-username>
export GHCR_TOKEN=<github-token>
export IMAGE_NAME=ghcr.io/<github-owner>/trendzip-backend
export IMAGE_TAG=$(git rev-parse --short HEAD)

scripts/ops/build-push-backend.sh
```

이후 같은 개발 머신에서 맥미니 배포까지 이어서 실행할 수 있다.

```bash
export MACMINI_HOST=<home-public-ip>
export MACMINI_PORT=2222
export MACMINI_USER=<macmini-user>
export MACMINI_APP_DIR=~/apps/trendzip

scripts/ops/deploy-macmini.sh
```

로컬 fallback은 GitHub Actions 장애, 권한 설정 전, 긴급 배포 상황에서 사용한다.

### 2.5 운영용 파일 추가

이번 단계에서 추가한 운영 파일:

```text
docker-compose.prod.yml
Caddyfile
backend/.env.prod.example
docs/ops/macmini-deployment.md
```

실제 운영 비밀값 파일은 커밋하지 않는다.

```text
backend/.env.prod
```

`backend/.env.prod.example`의 `POSTGRES_PASSWORD=change-me`는 예시값이다. 맥미니에 복사한 뒤 반드시 실제 비밀번호로 바꾼다.

### 2.6 운영 환경변수 정리

`backend/.env.prod.example`에 필요한 키 목록을 정리하고, 맥미니에서는 실제 값으로 `backend/.env.prod`를 만든다.

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

운영에서는 `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=false`를 기본으로 둔다. 컨테이너 재시작 때마다 외부 API 호출이 즉시 발생하는 것을 막기 위해서다.

## 3. Docker Compose 운영 구성

`docker-compose.prod.yml`에는 다음 서비스를 둔다.

- `backend`
- `postgres`
- `redis`
- `caddy`

backend는 `build`가 아니라 registry image를 사용한다. 기본 이미지는 현재 repository 기준으로 아래 값을 사용한다.

```text
ghcr.io/nadoran78/trendzip-backend:prod
```

다른 태그나 registry를 쓰고 싶으면 compose 실행 시 `BACKEND_IMAGE`를 지정한다.

```bash
BACKEND_IMAGE=ghcr.io/nadoran78/trendzip-backend:abc1234 \
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d
```

운영 환경변수 파일 경로는 기본적으로 `./backend/.env.prod`다. 로컬에서 예시 파일로 compose 문법만 확인하려면 다음처럼 바꿔서 실행한다.

```bash
BACKEND_ENV_FILE=./backend/.env.prod.example \
docker compose --env-file backend/.env.prod.example -f docker-compose.prod.yml config
```

포트 공개:

```yaml
caddy:
  ports:
    - "80:80"
    - "443:443"

backend:
  expose:
    - "8080"

postgres:
  ports:
    - "127.0.0.1:5432:5432"

redis:
  expose:
    - "6379"
```

PostgreSQL은 맥미니 로컬 인터페이스에만 열어 SSH 터널링으로 접근한다. Redis는 외부에 publish하지 않는다.

볼륨:

```yaml
volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:
```

### 3.1 Caddy 설정

`Caddyfile`은 현재 placeholder 도메인을 사용한다.

```text
api.trendzip.example.com
```

실제 배포 전에는 이 값을 구매한 도메인 또는 서브도메인으로 바꾼다.

예시:

```text
api.my-domain.com
```

Caddy는 해당 도메인의 DNS가 맥미니 공인 IP를 바라보고, 공유기에서 `80`, `443`이 맥미니로 포워딩되어 있을 때 HTTPS 인증서를 자동 발급한다.

## 4. 도메인과 서브도메인

도메인은 하나만 구매하고 서브도메인을 프로젝트별로 나누는 방식이 비용 효율적이다.

예시:

```text
trendzip.example.com       -> frontend
api.trendzip.example.com   -> backend
admin.trendzip.example.com -> optional admin
```

DNS 레코드 예시:

```text
Type: A
Name: api.trendzip
Value: <home-public-ip>
TTL: 300
```

집 인터넷의 공인 IP가 자주 바뀐다면 DDNS를 사용한다.

## 5. 공유기 포트포워딩

공유기에서 다음 포트를 맥미니 내부 IP로 포워딩한다.

```text
80  -> 192.168.0.20:80
443 -> 192.168.0.20:443
22  -> 192.168.0.20:22
```

SSH 포트 `22`를 외부에 열기 부담스럽다면 공유기 외부 포트를 다르게 열 수 있다.

예시:

```text
External 2222 -> 192.168.0.20:22
```

접속:

```bash
ssh -p 2222 macmini-user@<home-public-ip>
```

가능하면 SSH는 key 기반 접속만 허용한다.

## 6. DB 접속 방식

운영 PostgreSQL은 직접 publish하지 않는다.

개발 머신에서 SSH 터널을 연다.

```bash
ssh -L 5433:localhost:5432 macmini-user@<home-public-ip>
```

맥미니의 Docker Compose가 DB를 host에 publish하지 않는 구조라면, 터널 대상은 컨테이너 네트워크가 아니라 맥미니에서 접근 가능한 로컬 포트여야 한다. 이 경우 선택지는 두 가지다.

1. 운영 DB를 host에는 `127.0.0.1:5432`로만 publish한다.
2. SSH 접속 후 `docker compose exec postgres psql`로 직접 조회한다.

운영 편의성을 고려하면 `127.0.0.1:5432:5432`만 열고 외부 인터페이스에는 공개하지 않는 구성이 좋다.

예시:

```yaml
postgres:
  ports:
    - "127.0.0.1:5432:5432"
```

이렇게 하면 외부에서는 DB에 직접 접근할 수 없고, SSH 터널을 통해서만 접속할 수 있다.

로컬 DB 툴 접속 정보:

```text
Host: localhost
Port: 5433
Database: mztrend
User: mztrend
Password: <POSTGRES_PASSWORD>
```

## 7. 최초 배포 순서

먼저 개발 머신에서 운영 파일을 맥미니로 보낸다.

```bash
scp docker-compose.prod.yml macmini-user@192.168.0.20:~/apps/trendzip/
scp Caddyfile macmini-user@192.168.0.20:~/apps/trendzip/
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
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml config
```

그다음 backend 이미지를 build/push/deploy한다. 권장 경로는 GitHub Actions 화면에서 `deploy-backend` workflow를 수동 실행하는 것이다.

```text
GitHub Actions
  -> deploy-backend
  -> Run workflow
```

로컬에서 직접 진행하려면 개발 머신에서 같은 스크립트를 실행한다.

```bash
scripts/ops/build-push-backend.sh
scripts/ops/deploy-macmini.sh
```

초기 설정 확인을 위해 맥미니에서 직접 pull/up을 실행할 수도 있다.

```bash
cd ~/apps/trendzip
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d
```

컨테이너 상태 확인:

```bash
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml ps
```

로그 확인:

```bash
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml logs -f backend
```

DB 마이그레이션은 앱 시작 시 Flyway가 자동 실행되는 구조를 기본으로 한다. 별도 실행이 필요하면 다음 방식 중 하나를 선택한다.

개발 머신에서 운영 DB 터널을 연 뒤:

```bash
./gradlew flywayMigrate --no-daemon
```

운영 backend 이미지는 Gradle을 포함하지 않는 런타임 이미지로 만드는 것이 좋다. 따라서 운영에서는 앱 시작 시 Flyway 자동 실행을 기본값으로 유지하는 편이 단순하다.

## 8. 재배포 순서

재배포는 두 가지 경로를 지원한다.

### 8.1 GitHub Actions 수동 배포

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

`deploy-macmini.sh`는 GitHub Actions runner에서 실행되지만, 실제 컨테이너 재기동 명령은 SSH를 통해 맥미니 내부에서 실행한다.

맥미니 내부에서 실행되는 명령:

```bash
cd ~/apps/trendzip
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml up -d backend
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=200 backend
```

### 8.2 로컬 수동 배포

개발 머신에서 직접 같은 스크립트를 실행한다.

```bash
export GHCR_USERNAME=<github-username>
export GHCR_TOKEN=<github-token>
export IMAGE_NAME=ghcr.io/<github-owner>/trendzip-backend
export IMAGE_TAG=$(git rev-parse --short HEAD)
export MACMINI_HOST=<home-public-ip>
export MACMINI_PORT=2222
export MACMINI_USER=<macmini-user>
export MACMINI_APP_DIR=~/apps/trendzip

scripts/ops/build-push-backend.sh
scripts/ops/deploy-macmini.sh
```

정확한 버전을 고정해서 배포하고 싶다면 `prod` 태그 대신 commit SHA 태그를 `.env`나 compose 변수로 주입한다.

예시:

```env
BACKEND_IMAGE=ghcr.io/<github-owner>/trendzip-backend:abc1234
```

compose:

```yaml
backend:
  image: ${BACKEND_IMAGE}
```

## 9. 배포 후 검증

### 9.1 헬스체크

```bash
curl https://api.trendzip.example.com/api/health
```

백엔드 API도 직접 호출한다.

```bash
curl "https://api.trendzip.example.com/api/feed?generation=TEEN"
curl "https://api.trendzip.example.com/api/keywords?generation=TEEN"
```

### 9.2 DB 검증 SQL

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

## 10. 수동 크롤링

운영에서는 크롤링이 스케줄로 돌게 한다.

수동 실행 API나 CLI가 아직 없다면 다음 중 하나를 나중에 추가한다.

- 관리자용 내부 API
- Spring Boot actuator endpoint
- CLI runner
- 일시적으로 `APP_CRAWLING_SCHEDULER_RUN_ON_STARTUP=true`로 실행 후 다시 false로 복구

마지막 방식은 외부 API 호출을 중복 발생시킬 수 있으므로 운영에서는 신중하게 사용한다.

## 11. 백업

맥미니에서 백업 디렉터리를 만든다.

```bash
mkdir -p ~/backups/trendzip/postgres
```

수동 백업:

```bash
docker compose --env-file backend/.env.prod -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U mztrend -d mztrend \
  > ~/backups/trendzip/postgres/mztrend-$(date +%Y%m%d-%H%M%S).sql
```

최근 14일만 보관:

```bash
find ~/backups/trendzip/postgres -name "mztrend-*.sql" -mtime +14 -delete
```

자동화는 macOS `launchd`나 crontab 중 익숙한 방식으로 시작한다.

## 12. 운영 점검 루틴

매일 또는 배포 후 확인:

- 컨테이너 상태: `docker compose --env-file backend/.env.prod -f docker-compose.prod.yml ps`
- 백엔드 로그: `docker compose --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=200 backend`
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

## 13. 다음 구현 TODO

문서화 이후 실제 코드/설정 작업은 다음 순서로 진행한다.

- `backend/Dockerfile` 추가
- `.dockerignore` 추가
- `scripts/ops/build-push-backend.sh` 추가
- `scripts/ops/deploy-macmini.sh` 추가
- `.github/workflows/deploy-backend.yml` 추가
- 백엔드 prod profile 필요 여부 확인
- actuator health 노출 여부 결정
- 백업 스크립트 추가
- 반복 운영 명령을 `Makefile` 또는 추가 `scripts/ops` 스크립트로 정리
