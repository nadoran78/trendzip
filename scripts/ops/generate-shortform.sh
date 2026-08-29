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
  ./scripts/ops/generate-shortform.sh
  ./scripts/ops/generate-shortform.sh <operational-manifest.json>

Without a manifest, the script prepares a new operational draft before TTS and rendering.
With a manifest, it reuses that reserved DRAFT and starts from TTS generation.
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

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is not available: $1"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

require_command "$NODE_BIN"
require_command "$NPM_BIN"
[[ -d "$MEDIA_DIR" ]] || fail "Media directory does not exist: $MEDIA_DIR"

manifest_path="${1:-}"
if [[ -z "$manifest_path" ]]; then
  printf 'Preparing a new operational draft...\n'
  prepare_stderr_file="$(mktemp "${TMPDIR:-/tmp}/trendzip-shortform-prepare.XXXXXX")"
  trap 'rm -f "$prepare_stderr_file"' EXIT
  set +e
  prepare_output="$({
    cd "$MEDIA_DIR"
    "$NPM_BIN" --silent run draft:prepare
  } 2>"$prepare_stderr_file")"
  prepare_status=$?
  set -e

  printf '%s\n' "$prepare_output"
  if [[ -s "$prepare_stderr_file" ]]; then
    cat "$prepare_stderr_file" >&2
  fi
  rm -f "$prepare_stderr_file"
  trap - EXIT
  if [[ $prepare_status -eq 2 ]]; then
    printf 'No draft was reserved because the candidate was held or blocked.\n' >&2
    exit 2
  fi
  if [[ $prepare_status -ne 0 ]]; then
    printf 'Draft preparation failed with exit code %s.\n' "$prepare_status" >&2
    exit "$prepare_status"
  fi

  manifest_path="$(
    printf '%s' "$prepare_output" | "$NODE_BIN" -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { input += chunk; });
      process.stdin.on("end", () => {
        const result = JSON.parse(input);
        if (typeof result.outputPath !== "string" || result.outputPath.length === 0) {
          throw new Error("draft:prepare did not return outputPath.");
        }
        process.stdout.write(result.outputPath);
      });
    '
  )"
  manifest_path="$(resolve_path "$manifest_path")"
else
  manifest_path="$(resolve_path "$manifest_path")"
fi

[[ -f "$manifest_path" ]] || fail "Operational manifest does not exist: $manifest_path"

shortform_content_id="$("$NODE_BIN" -e '
  const {readFileSync} = require("node:fs");
  const manifest = JSON.parse(readFileSync(process.argv[1], "utf8"));
  const id = manifest?.reservation?.shortformContentId;
  if (!Number.isInteger(id) || id < 1 || manifest?.status !== "DRAFT") {
    throw new Error("The operational manifest must contain a reserved DRAFT content ID.");
  }
  process.stdout.write(String(id));
' "$manifest_path")"
timestamp="$("$NODE_BIN" -e 'process.stdout.write(new Date().toISOString().replaceAll(":", "-").replace(".", "-"));')"
run_dir="$MEDIA_DIR/out/operational-renders/$shortform_content_id/$timestamp"

printf 'Generating operational TTS in %s\n' "$run_dir"
(
  cd "$MEDIA_DIR"
  "$NPM_BIN" run tts:operational -- "$manifest_path" "$run_dir"
  "$NPM_BIN" run render:operational -- "$run_dir"
)

[[ -f "$run_dir/video.mp4" ]] || fail "Rendered video was not created: $run_dir/video.mp4"
[[ -f "$run_dir/render-manifest.json" ]] || \
  fail "Render manifest was not created: $run_dir/render-manifest.json"

mkdir -p "$(dirname "$LATEST_RUN_FILE")"
latest_run_tmp="$LATEST_RUN_FILE.tmp.$$"
trap 'rm -f "$latest_run_tmp"' EXIT
printf '%s\n' "$run_dir" > "$latest_run_tmp"
mv "$latest_run_tmp" "$LATEST_RUN_FILE"

printf '\nShort-form public candidate video is ready.\n'
printf 'Run directory: %s\n' "$run_dir"
printf 'Video: %s\n' "$run_dir/video.mp4"
printf 'Review the full video before recording a decision.\n'
printf 'Next command: ./scripts/ops/review-shortform.sh %q\n' "$run_dir"
