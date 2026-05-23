# Napkin

## Corrections

- PR #85's review concept is select-to-record and release/clear selection to transcribe/action the recording. Do not add a separate Dictate button or manual paste flow.

## User Preferences

## Patterns That Work

- Select-to-record needs local transcription configured and client-side transcription bounded with visible failure states.

## Patterns That Don't Work

- Browser microphone capture without `ROUGHDRAFT_VOICE_TRANSCRIBE_COMMAND` produces an empty transcript and surfaces as "No speech detected."

## Domain Notes

- Hex (`com.kitlangton.Hex`) captures/transcribes outside Roughdraft. Unless Hex exposes an automation API, it is not the same control path as Roughdraft's automatic browser microphone recording.
