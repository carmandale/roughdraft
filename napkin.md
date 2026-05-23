# Napkin

## Corrections

## User Preferences

## Patterns That Work

- For PR #85-style voice feedback, treating OS dictation tools as paste sources is more robust than depending on browser microphone capture.

## Patterns That Don't Work

- Browser microphone capture without `ROUGHDRAFT_VOICE_TRANSCRIBE_COMMAND` produces an empty transcript and surfaces as "No speech detected."

## Domain Notes

- Hex (`com.kitlangton.Hex`) captures/transcribes outside Roughdraft and pastes text into the focused app, so Roughdraft should consume the pasted transcript as the feedback utterance.
