#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

slog_event() {
  local event="$1"
  local data_json="$2"

  if [[ -z "${THOUGHTFUL_SLOG_FILE:-}" ]] || ! command -v node >/dev/null 2>&1; then
    return
  fi

  node -e '
const fs = require("node:fs");
const path = require("node:path");
const [file, runId, event, dataJson] = process.argv.slice(1);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.appendFileSync(file, JSON.stringify({
  ts: new Date().toISOString(),
  runId: runId || "manual",
  source: "scripts/transcribe-parakeet.sh",
  event,
  data: JSON.parse(dataJson)
}) + "\n");
' "$THOUGHTFUL_SLOG_FILE" "${THOUGHTFUL_SLOG_RUN_ID:-manual}" "$event" "$data_json" 2>/dev/null || true
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "usage: scripts/transcribe-parakeet.sh <audio> [output]" >&2
  exit 2
fi

input_audio="$1"
output_path="${2:-}"

if [[ ! -f "$input_audio" ]]; then
  echo "transcribe-parakeet: audio file not found: $input_audio" >&2
  exit 2
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "transcribe-parakeet: ffmpeg is required to normalize browser audio for Parakeet" >&2
  exit 2
fi

package_dir="$repo_root/tools/parakeet-transcribe"
scratch_dir="$repo_root/.roughdraft-state/parakeet-swiftpm"
binary="$scratch_dir/release/roughdraft-parakeet-transcribe"

swift build \
  --package-path "$package_dir" \
  --scratch-path "$scratch_dir" \
  -c release >/dev/null

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/roughdraft-parakeet.XXXXXX")"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

normalized_audio="$tmp_dir/audio.wav"
ffmpeg \
  -nostdin \
  -v error \
  -y \
  -i "$input_audio" \
  -ac 1 \
  -ar 16000 \
  -c:a pcm_f32le \
  -af "apad=pad_dur=1.5" \
  "$normalized_audio"
slog_event "audio.normalized" "{\"inputBytes\":$(stat -f %z "$input_audio"),\"outputBytes\":$(stat -f %z "$normalized_audio")}"

selected_model="${ROUGHDRAFT_PARAKEET_MODEL:-}"
hex_settings="$HOME/Library/Containers/com.kitlangton.Hex/Data/Library/Application Support/com.kitlangton.Hex/hex_settings.json"

if [[ -z "$selected_model" && -f "$hex_settings" ]] && command -v node >/dev/null 2>&1; then
  selected_model="$(node -e 'const fs = require("node:fs"); const file = process.argv[1]; try { const model = JSON.parse(fs.readFileSync(file, "utf8")).selectedModel; if (typeof model === "string") process.stdout.write(model); } catch {}' "$hex_settings")"
fi

if [[ -z "$selected_model" ]]; then
  selected_model="parakeet-tdt-0.6b-v2-coreml"
fi

case "$selected_model" in
  v2|parakeet-tdt-0.6b-v2-coreml)
    model_version="v2"
    model_name="parakeet-tdt-0.6b-v2-coreml"
    ;;
  v3|parakeet-tdt-0.6b-v3-coreml)
    model_version="v3"
    model_name="parakeet-tdt-0.6b-v3-coreml"
    ;;
  *)
    echo "transcribe-parakeet: unsupported ROUGHDRAFT_PARAKEET_MODEL: $selected_model" >&2
    exit 2
    ;;
esac

model_dir="${ROUGHDRAFT_PARAKEET_MODEL_DIR:-}"
if [[ -z "$model_dir" ]]; then
  hex_model_dir="$HOME/Library/Containers/com.kitlangton.Hex/Data/Library/Application Support/FluidAudio/Models/$model_name"
  fluid_model_dir="$HOME/Library/Application Support/FluidAudio/Models/$model_name"
  if [[ -d "$hex_model_dir" ]]; then
    model_dir="$hex_model_dir"
    model_dir_source="hex"
  elif [[ -d "$fluid_model_dir" ]]; then
    model_dir="$fluid_model_dir"
    model_dir_source="fluid-audio"
  fi
else
  model_dir_source="env"
fi

args=("$normalized_audio" "--model" "$model_version")
if [[ -n "$model_dir" ]]; then
  args+=("--model-dir" "$model_dir")
fi
if [[ -n "$output_path" ]]; then
  args+=("--output" "$output_path")
fi

slog_event "parakeet.invoke" "{\"model\":\"$model_name\",\"modelVersion\":\"$model_version\",\"modelDirSource\":\"${model_dir_source:-download}\"}"
set +e
"$binary" "${args[@]}"
status=$?
set -e
slog_event "parakeet.done" "{\"status\":$status}"
exit "$status"
