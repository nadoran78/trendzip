#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

prompt_required() {
  local name="$1"
  local label="$2"
  local value="${!name:-}"

  if [[ -n "$value" ]]; then
    return
  fi

  if [[ ! -t 0 ]]; then
    echo "$name is required. Set it as an environment variable." >&2
    exit 1
  fi

  read -r -p "$label: " value

  if [[ -z "$value" ]]; then
    echo "$name is required." >&2
    exit 1
  fi

  printf -v "$name" '%s' "$value"
  export "$name"
}

prompt_required MACMINI_HOST "Mac mini host"
prompt_required MACMINI_USER "Mac mini user"

MACMINI_PORT="${MACMINI_PORT:-22}"
MACMINI_APP_DIR="${MACMINI_APP_DIR:-~/apps/trendzip}"
MACMINI_COMPOSE_CMD="${MACMINI_COMPOSE_CMD:-docker-compose}"
REMOTE_PATH="${REMOTE_PATH:-/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin}"
REMOTE_DOCKER_CONFIG="${REMOTE_DOCKER_CONFIG:-~/.docker-headless}"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/nadoran78/trendzip-backend}"
DEPLOY_TAG="${DEPLOY_TAG:-prod}"
BACKEND_IMAGE="${BACKEND_IMAGE:-$IMAGE_NAME:$DEPLOY_TAG}"
SYNC_COMPOSE="${SYNC_COMPOSE:-true}"
SHOW_BACKEND_LOGS="${SHOW_BACKEND_LOGS:-true}"

ssh_target="$MACMINI_USER@$MACMINI_HOST"
ssh_opts=(-p "$MACMINI_PORT" -o StrictHostKeyChecking=accept-new)
scp_opts=(-P "$MACMINI_PORT" -o StrictHostKeyChecking=accept-new)

if [[ -n "${SSH_KEY_PATH:-}" ]]; then
  ssh_opts+=(-i "$SSH_KEY_PATH")
  scp_opts+=(-i "$SSH_KEY_PATH")
fi

echo "Preparing remote app directory: $ssh_target:$MACMINI_APP_DIR"
ssh "${ssh_opts[@]}" "$ssh_target" "mkdir -p $MACMINI_APP_DIR/backend"

if [[ "$SYNC_COMPOSE" == "true" ]]; then
  echo "Syncing docker-compose.prod.yml"
  scp "${scp_opts[@]}" \
    "$REPO_ROOT/docker-compose.prod.yml" \
    "$ssh_target:$MACMINI_APP_DIR/docker-compose.prod.yml"
else
  echo "Skipping compose sync because SYNC_COMPOSE=$SYNC_COMPOSE"
fi

echo "Deploying backend image: $BACKEND_IMAGE"
ssh "${ssh_opts[@]}" "$ssh_target" "
  set -e
  export PATH=\"$REMOTE_PATH:\$PATH\"
  cd $MACMINI_APP_DIR
  test -f backend/.env.prod
  DOCKER_CONFIG=$REMOTE_DOCKER_CONFIG BACKEND_IMAGE='$BACKEND_IMAGE' $MACMINI_COMPOSE_CMD --env-file backend/.env.prod -f docker-compose.prod.yml pull backend
  DOCKER_CONFIG=$REMOTE_DOCKER_CONFIG BACKEND_IMAGE='$BACKEND_IMAGE' $MACMINI_COMPOSE_CMD --env-file backend/.env.prod -f docker-compose.prod.yml up -d
  DOCKER_CONFIG=$REMOTE_DOCKER_CONFIG BACKEND_IMAGE='$BACKEND_IMAGE' $MACMINI_COMPOSE_CMD --env-file backend/.env.prod -f docker-compose.prod.yml ps
"

if [[ "$SHOW_BACKEND_LOGS" == "true" ]]; then
  echo "Recent backend logs"
  ssh "${ssh_opts[@]}" "$ssh_target" "
    export PATH=\"$REMOTE_PATH:\$PATH\"
    cd $MACMINI_APP_DIR
    DOCKER_CONFIG=$REMOTE_DOCKER_CONFIG BACKEND_IMAGE='$BACKEND_IMAGE' $MACMINI_COMPOSE_CMD --env-file backend/.env.prod -f docker-compose.prod.yml logs --tail=120 backend
  "
fi

echo "Backend deploy command completed."
