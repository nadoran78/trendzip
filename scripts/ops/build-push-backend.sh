#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-ghcr.io/nadoran78/trendzip-backend}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$REPO_ROOT" rev-parse --short=12 HEAD)}"
PROD_TAG="${PROD_TAG:-prod}"
PUSH_IMAGE="${PUSH_IMAGE:-true}"
TAG_PROD="${TAG_PROD:-true}"
GRADLE_TASKS="${GRADLE_TASKS:-bootJar}"

read -r -a gradle_tasks <<< "$GRADLE_TASKS"

echo "Building backend jar with Gradle tasks: ${gradle_tasks[*]}"
(
  cd "$REPO_ROOT/backend"
  ./gradlew "${gradle_tasks[@]}" --no-daemon
)

docker_tags=(-t "$IMAGE_NAME:$IMAGE_TAG")
if [[ "$TAG_PROD" == "true" ]]; then
  docker_tags+=(-t "$IMAGE_NAME:$PROD_TAG")
fi

echo "Building backend image: $IMAGE_NAME:$IMAGE_TAG"
docker build \
  -f "$REPO_ROOT/backend/Dockerfile" \
  "${docker_tags[@]}" \
  "$REPO_ROOT"

if [[ "$PUSH_IMAGE" == "true" ]]; then
  echo "Pushing backend image: $IMAGE_NAME:$IMAGE_TAG"
  docker push "$IMAGE_NAME:$IMAGE_TAG"

  if [[ "$TAG_PROD" == "true" ]]; then
    echo "Pushing backend image: $IMAGE_NAME:$PROD_TAG"
    docker push "$IMAGE_NAME:$PROD_TAG"
  fi
else
  echo "Skipping docker push because PUSH_IMAGE=$PUSH_IMAGE"
fi

echo "Backend image is ready: $IMAGE_NAME:$IMAGE_TAG"
