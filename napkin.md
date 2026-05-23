# Napkin

## Corrections

- Do not frame Hex support as manual transcript paste. The user wants natural speaking: Roughdraft should focus a capture field so Hex can inject dictated text while the user speaks.

## User Preferences

## Patterns That Work

- For PR #85-style voice feedback, treating OS dictation tools as focused text-input sources is more robust than depending on browser microphone capture.

## Patterns That Don't Work

- Browser microphone capture without `ROUGHDRAFT_VOICE_TRANSCRIBE_COMMAND` produces an empty transcript and surfaces as "No speech detected."

## Domain Notes

- Hex (`com.kitlangton.Hex`) captures/transcribes outside Roughdraft and injects text into the focused app, so Roughdraft should focus a dedicated capture field and consume the resulting text as the feedback utterance.
