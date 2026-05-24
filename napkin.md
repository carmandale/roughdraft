# Napkin

## Corrections

- PR #85's review concept is select-to-record and release/clear selection to transcribe/action the recording. Do not add a separate Dictate button or manual paste flow.

## User Preferences

## Patterns That Work

- Select-to-record needs local transcription configured and client-side transcription bounded with visible failure states.
- On Apple Silicon, `scripts/transcribe-parakeet.sh {audio} {output}` uses FluidAudio/Parakeet directly, converts browser WebM with ffmpeg, and reuses Hex's installed model cache when present.
- Voice intent inference should accept the standard `OPENROUTER_API_KEY` env var, with `ROUGHDRAFT_OPENROUTER_API_KEY` reserved as an override.
- Natural voice commands need ordinary edit verbs like `rephrase`, not just developer-ish verbs like `rewrite`.

## Patterns That Don't Work

- Browser microphone capture without `ROUGHDRAFT_VOICE_TRANSCRIBE_COMMAND` produces an empty transcript and surfaces as "No speech detected."
- Hex is a working Parakeet app, but its hotkey/clipboard UI is not a stable file-transcription API for Roughdraft.
- A successful transcript with no OpenRouter key degrades into `[uncertain]` comments; that means action inference is unconfigured, not that speech capture failed.

## Domain Notes

- Hex (`com.kitlangton.Hex`) captures/transcribes outside Roughdraft. Unless Hex exposes an automation API, it is not the same control path as Roughdraft's automatic browser microphone recording.
