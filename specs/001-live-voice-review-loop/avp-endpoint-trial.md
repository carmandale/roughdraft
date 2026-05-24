---
title: "AVP Endpoint Trial"
date: 2026-05-24
bead: bd-1ny1
status: ready-for-avp-trial
---

# AVP Endpoint Trial

## Purpose

Decide whether the default Roughdraft voice endpoint, select-to-record and release/clear-selection-to-act, is usable on Apple Vision Pro for two consecutive live review rounds.

This trial is required before the Live Voice Review Loop can be called complete. Desktop/browser tests can support this report, but they do not replace the AVP endpoint decision.

## Endpoint Under Test

- Variant: `select-to-record/release-to-act`
- Endpoint action: select text in the editor to start recording; speak naturally; release or clear the selection to stop recording, transcribe, classify, save CriticMarkup, and attach the saved review round.
- Fallback under consideration: a minimal visible Done/Cancel endpoint only if AVP testing shows release/clear-selection is unreliable or undiscoverable.
- Fallback implemented: `no`

## Test Surface

- Worktree CLI: `/Users/dalecarman/.local/bin/roughdraft-dev-roughdraft`
- Test Markdown path: `/tmp/roughdraft-avp-live-voice-loop.md`
- Open command:

```bash
ROUGHDRAFT_NO_OPEN=1 roughdraft-dev-roughdraft open /tmp/roughdraft-avp-live-voice-loop.md --no-watch --print-url
```

- Trial URL:

```text
http://localhost:7373/?path=%2Ftmp%2Froughdraft-avp-live-voice-loop.md
```

- Follow watcher command:

```bash
roughdraft-dev-roughdraft watch /tmp/roughdraft-avp-live-voice-loop.md --follow --json
```

- Active watcher log: `/tmp/roughdraft-avp-live-voice-loop.watch.ndjson`
- Active watcher error log: `/tmp/roughdraft-avp-live-voice-loop.watch.err`
- Active watcher tmux session: `roughdraft-avp-watch`
- Active watcher session: `00a9294b-8a69-4ac7-a6b9-0d2f8b52131c`
- Server status: running at `http://localhost:7373`; watcher status confirmed at `2026-05-24T22:54:46.168Z`.

## Trial Script

1. Open the printed Roughdraft URL on Apple Vision Pro.
2. Select `target phrase` in the first paragraph.
3. Speak one natural review instruction.
4. Release or clear the selection.
5. Confirm the visible timeline reaches saved proof or a concrete failure reason.
6. Click Done Reviewing.
7. Confirm the follow watcher receives the first `review.completed` event.
8. Simulate or allow an external Markdown edit after the handoff.
9. Confirm the evidence surface says `Markdown file changed after handoff` with elapsed timing, not that an agent replied.
10. Repeat steps 2-9 for a second review round without restarting the watcher.

## Desktop Prototype Evidence

The default endpoint has been prototyped through the current app timeline in automated desktop component coverage:

```bash
pnpm --filter @roughdraft/app exec vitest run src/PageCard.voice.test.ts --testNamePattern "records, transcribes, applies, saves, and binds saved version proof on selection release|covers the select-to-record loop states"
```

Result: passed at 2026-05-24T16:14:45Z with 1 file passed, 2 tests passed, 4 skipped by filter.

What this proves:

- The timeline stages include listening, stopping, transcribing, transcript received, classifying, applying, saving, saved, failed, stale, and discarded.
- Selecting text starts a voice review run.
- Clearing the selection releases the recording path.
- The transcript is processed into review feedback.
- The edit is saved and the saved file version is bound to review-loop proof.

What this does not prove:

- Apple Vision Pro selection/release ergonomics.
- Apple Vision Pro microphone permission behavior.
- Discoverability of release/clear-selection as the stop action.
- The two-round manual acceptance outcome.

## Required Observations

| Field | Result |
|---|---|
| AVP device available | pending |
| Microphone permission prompt visible/usable | pending |
| Selecting text starts recording | pending |
| User can tell Roughdraft is listening | pending |
| Release/clear selection stops recording | pending |
| Transcript appears or failure is concrete | pending |
| Classification/apply/save timeline is visible | pending |
| Saved version proof is visible | pending |
| Done Reviewing blocks or degrades honestly when proof is missing | pending |
| Watcher receives round 1 without restart | pending |
| File-change observation appears after round 1 | pending |
| Watcher receives round 2 without restart | pending |
| File-change observation appears after round 2 | pending |
| Endpoint discoverability | pending |
| Reduced-motion/accessibility concern observed | pending |

## Timing Evidence

| Round | Listening | Transcribing | Classifying | Saving | Handoff | File-change observation |
|---|---:|---:|---:|---:|---:|---:|
| 1 | pending | pending | pending | pending | pending | pending |
| 2 | pending | pending | pending | pending | pending | pending |

## Watcher Evidence

| Round | Handoff id | Round id | Run ids | Watcher session | Delivery state | File-change version |
|---|---|---|---|---|---|---|
| 1 | pending | pending | pending | pending | pending | pending |
| 2 | pending | pending | pending | pending | pending | pending |

## Transcript Behavior

- Empty transcript behavior: pending
- Successful transcript behavior: pending
- `[uncertain]`/classification fallback behavior: pending
- Redaction check: pending

## Selected Result

- Endpoint decision: pending
- Trial result: pending
- If inconclusive, reason: pending
- If blocked, blocker and resume condition: awaiting Apple Vision Pro two-round manual report from Dale; desktop prototype is supportive only and does not close the AVP requirement.
