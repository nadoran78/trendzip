#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MEDIA_DIR="${TRENDZIP_MEDIA_DIR:-$REPO_ROOT/media}"
NPM_BIN="${TRENDZIP_NPM_BIN:-npm}"
NODE_BIN="${TRENDZIP_NODE_BIN:-node}"
LATEST_RUN_FILE="$MEDIA_DIR/out/operational-renders/.latest-run"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/ops/review-shortform.sh [run-directory]
    [--decision=APPROVED|NEEDS_REVISION|REJECTED]
    [--reviewer=<name>]
    [--reason=<reason>]

If run-directory is omitted, the most recently generated operational render is used.
The selected decision must be typed once more before registration and review are recorded.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

resolve_path() {
  "$NODE_BIN" -e \
    'const {resolve} = require("node:path"); process.stdout.write(resolve(process.argv[1]));' \
    "$1"
}

manifest_value() {
  "$NODE_BIN" -e '
    const {readFileSync} = require("node:fs");
    const manifest = JSON.parse(readFileSync(process.argv[1], "utf8"));
    const path = process.argv[2].split(".");
    let value = manifest;
    for (const key of path) value = value?.[key];
    if (value !== null && value !== undefined) process.stdout.write(String(value));
  ' "$manifest_path" "$1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is not available: $1"
}

run_directory=""
decision=""
reviewer=""
reason=""

for argument in "$@"; do
  case "$argument" in
    --help|-h)
      usage
      exit 0
      ;;
    --decision=*) decision="${argument#*=}" ;;
    --reviewer=*) reviewer="${argument#*=}" ;;
    --reason=*) reason="${argument#*=}" ;;
    --*) fail "Unknown option: $argument" ;;
    *)
      [[ -z "$run_directory" ]] || fail "Only one run directory can be provided."
      run_directory="$argument"
      ;;
  esac
done

require_command "$NODE_BIN"
require_command "$NPM_BIN"
[[ -d "$MEDIA_DIR" ]] || fail "Media directory does not exist: $MEDIA_DIR"

if [[ -z "$run_directory" ]]; then
  [[ -f "$LATEST_RUN_FILE" ]] || \
    fail "No latest render was recorded. Provide a run directory explicitly."
  IFS= read -r run_directory < "$LATEST_RUN_FILE"
fi

run_directory="$(resolve_path "$run_directory")"
manifest_path="$run_directory/render-manifest.json"
[[ -f "$manifest_path" ]] || fail "Render manifest does not exist: $manifest_path"

video_relative_path="$(manifest_value 'files.video')"
[[ -n "$video_relative_path" ]] || fail "Render manifest does not contain files.video."
video_path="$run_directory/$video_relative_path"
[[ -f "$video_path" ]] || fail "Review video does not exist: $video_path"

existing_review="$(manifest_value 'review.decision')"
if [[ -n "$existing_review" ]]; then
  printf 'This artifact already has a review decision: %s\n' "$existing_review"
  printf 'Run directory: %s\n' "$run_directory"
  exit 0
fi

"$NODE_BIN" -e '
  const {readFileSync} = require("node:fs");
  const manifest = JSON.parse(readFileSync(process.argv[1], "utf8"));
  console.log("Short-form review target");
  console.log(`  Content ID: ${manifest.shortformContentId}`);
  console.log(`  Artifact hash: ${manifest.artifactHash}`);
  console.log(`  Video: ${process.argv[2]}`);
  console.log("  Checklist:");
  for (const item of manifest.reviewChecklist ?? []) console.log(`    - ${item}`);
  for (const warning of manifest.sourceReviewWarnings ?? []) {
    const description = typeof warning === "string"
      ? warning
      : warning.message ?? warning.code ?? JSON.stringify(warning);
    console.log(`    - Source warning: ${description}`);
  }
' "$manifest_path" "$video_path"

if [[ -z "$decision" ]]; then
  printf '\nChoose a review decision:\n'
  printf '  1) APPROVED\n'
  printf '  2) NEEDS_REVISION\n'
  printf '  3) REJECTED\n'
  printf 'Decision: '
  IFS= read -r decision_input || fail "A review decision is required."
  case "$decision_input" in
    1|APPROVED|approved) decision="APPROVED" ;;
    2|NEEDS_REVISION|needs_revision) decision="NEEDS_REVISION" ;;
    3|REJECTED|rejected) decision="REJECTED" ;;
    *) fail "Decision must be APPROVED, NEEDS_REVISION, or REJECTED." ;;
  esac
else
  decision="$(printf '%s' "$decision" | tr '[:lower:]' '[:upper:]')"
fi

case "$decision" in
  APPROVED|NEEDS_REVISION|REJECTED) ;;
  *) fail "Decision must be APPROVED, NEEDS_REVISION, or REJECTED." ;;
esac

if [[ -z "$reviewer" ]]; then
  default_reviewer="${USER:-operator}"
  printf 'Reviewer [%s]: ' "$default_reviewer"
  IFS= read -r reviewer_input || fail "A reviewer is required."
  reviewer="${reviewer_input:-$default_reviewer}"
fi
[[ -n "$reviewer" ]] || fail "A reviewer is required."

if [[ -z "$reason" ]]; then
  printf 'Reason: '
  IFS= read -r reason || fail "A review reason is required."
fi
[[ -n "$reason" ]] || fail "A review reason is required."

printf '\nDecision summary\n'
printf '  Decision: %s\n' "$decision"
printf '  Reviewer: %s\n' "$reviewer"
printf '  Reason: %s\n' "$reason"
printf 'Type %s to register this artifact and record the decision: ' "$decision"
IFS= read -r confirmation || fail "Explicit confirmation is required."
if [[ "$confirmation" != "$decision" ]]; then
  printf 'Review was cancelled. Nothing was registered or recorded.\n'
  exit 3
fi

registration_id="$(manifest_value 'registration.artifactId')"
if [[ -z "$registration_id" ]]; then
  printf '\nRegistering the reviewed render artifact...\n'
  (
    cd "$MEDIA_DIR"
    "$NPM_BIN" run draft:register -- "$run_directory"
  )
else
  printf '\nArtifact is already registered as ID %s. Skipping registration.\n' "$registration_id"
fi

printf 'Recording the explicit human review decision...\n'
(
  cd "$MEDIA_DIR"
  "$NPM_BIN" run draft:review -- "$run_directory" \
    "--decision=$decision" \
    "--reviewer=$reviewer" \
    "--reason=$reason"
)

final_status="$(manifest_value 'review.contentStatus')"
final_decision="$(manifest_value 'review.decision')"
printf '\nReview completed.\n'
printf '  Decision: %s\n' "$final_decision"
printf '  Content status: %s\n' "$final_status"
printf '  Run directory: %s\n' "$run_directory"
