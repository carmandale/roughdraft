---
title: "Live Voice Review Loop"
date: 2026-05-24
bead: bd-1ny1
---

<!-- issue:complete:v1 | harness: unknown | date: 2026-05-24T11:47:43Z -->

# Live Voice Review Loop

## Source (verbatim)

> "Oh no, you completely missed the whole concept. The whole point of this is naturally speaking, not pasting." — user, 2026-05-24

> "It is not working and I wonder if you're confused about how it works. It currently says transcribing audio. I don't know if you can see the console. There is no dictate button to click that I'm aware of. The way the demo worked online and video is that you just select the text and it automatically starts recording, which is what appears to happen. And whatever you release is when it acts on the recording. In your earlier attempts, it would say no audio detected. In your current attempt, it says transcribing audio, but nothing ever happens." — user, 2026-05-24

> "it doesn't appear to be working. [Image #1] what does the [uncertain] mean? and it did transcribe my audio while on AVP, and it says it is working, but it has been going a long time." — user, 2026-05-24

> "I think one cohesive you expect I can tell that it hears me and that it's working." — user, 2026-05-24

> "I ultimately want this to look cool. But right now I don't want us to have any distractions if it's easy to use my review animation, I want to. If you have to figure out how to do it or can't do it on your first try, then I want you to do something that you can do fast. Keep using $grill-me and ask any other questions to finalize this first spec" — user, 2026-05-24

> "include auto rearm as a must-have." — user, 2026-05-24

> "Let's also have time stamps so that we know how long things are taking." — user, 2026-05-24

> "I think so, but we will need to rapid prototype and test this. we won't know the answer until we try it" — user, 2026-05-24

> "I agree with all of this." — user, 2026-05-24

## Problem

Roughdraft's PR #85 voice review flow is conceptually right: selecting text starts recording, the user speaks naturally, and releasing or clearing the selection turns the recording into review feedback. In practice, the experience is not trustworthy enough yet, especially on Apple Vision Pro.

The current loop can transcribe and save feedback while still feeling broken because the user cannot reliably tell whether Roughdraft is listening, transcribing, classifying, saving, handing off to an agent, waiting for a reply, or disconnected. A one-shot watcher also means the second review round silently loses the agent unless the operator manually reattaches it.

Purpose Contract:

- Outcome: Roughdraft's voice review loop feels visibly alive and honest from speech capture through external-agent reply.
- Done means: a user can complete two AVP review rounds, see timestamps for each step, know whether an agent is attached, receive a reply, and continue without asking the agent to watch again.
- Not done: a green build, a prettier spinner, a single successful transcription, or a "Your agent is working" toast that is not backed by a delivered watcher handoff.

## Requirements

1. Roughdraft must expose compact, trustworthy live status for the whole voice review chain:
   - listening
   - stopping recording
   - transcribing
   - transcript received
   - classifying voice action
   - comment saved
   - suggestion saved
   - voice failed with a concrete reason
2. Roughdraft must expose compact, trustworthy live status for the external-agent chain:
   - no agent attached
   - agent watching
   - agent notified
   - waiting for reply
   - reply added
   - watch rearmed
   - watch failed or disconnected with a concrete reason
3. The UI must avoid false agent progress copy:
   - `Agent notified` means a watcher actually received the handoff.
   - `Waiting for reply` means the handoff was delivered and Roughdraft is watching for document changes.
   - `Agent working` must not appear unless there is a real agent-side signal; otherwise use more conservative copy.
4. The right rail should be the source of truth for live review status.
5. The right rail must include a compact activity timeline with timestamps and elapsed durations for active and completed steps.
6. Continuous watch / auto-rearm is required:
   - a watcher must be able to receive multiple `review.completed` events for the same document without the agent re-running a watch command after each event.
   - the app must reflect whether at least one watcher is currently attached to the active document.
7. The recording endpoint interaction must be prototyped, not over-decided:
   - Variant A: selection starts recording, a stable `Done` / `Cancel` control appears, success clears the selection.
   - Variant B: selection starts recording, no explicit endpoint control, success clears the selection and relies on stronger status.
   - Apple Vision Pro testing decides the final interaction.
8. Prefer reusing the GJDraw thinking animation from `~/dev/gjdraw/src/app/d/[id]/ThinkingIndicator.tsx` if it drops in quickly.
9. If the GJDraw animation does not drop in cleanly on the first implementation pass, use a simpler polished Roughdraft-native indicator instead.
10. Roughdraft must keep the response agent external in this lane. OpenRouter may continue to classify voice intent, but Roughdraft must not generate agent replies itself.
11. The implementation must preserve CriticMarkup-in-Markdown as the durable review source of truth.
12. The implementation must include enough structured logs and user-facing timing to debug AVP-specific delays without guessing.

## Constraint

- This is a local-first Chrome web app over Markdown files, not a Chrome extension, Electron app, or cloud document backend.
- Do not let visual polish distract from reliable state truth.
- Do not claim agent progress from a browser-only state if no watcher actually received the handoff.
- Do not make manual deselect the only way to finish recording if prototype testing shows it is awkward on AVP.
- Do not ship permanent dual recording modes unless prototype evidence proves both are necessary.
- Avoid leaking secrets or raw API keys in status, timeline, or logs.
- UI work must follow the repo's shadcn/local component conventions.
- Before PR update, run `pnpm check` and `pnpm test:smoke`.

## Acceptance Criteria

1. On a real markdown file, selecting text and speaking produces visible right-rail status through listening, transcription, classification, and saved feedback.
2. Active steps show elapsed time while running.
3. Completed steps preserve timestamp and duration in a compact timeline.
4. Missing voice transcription configuration, transcription failure, empty transcript, OpenRouter failure, or action-classification fallback surfaces as a concrete failure or degraded state instead of an infinite spinner or unexplained `[uncertain]`.
5. Done Reviewing with no watcher attached shows a truthful `No agent attached` or equivalent state, not "agent working."
6. Done Reviewing with a watcher attached records `Agent notified`, then `Waiting for reply`.
7. When the external agent writes a reply to the Markdown file, Roughdraft records `Reply added` or equivalent in the timeline.
8. Continuous watch receives at least two `review.completed` events for the same document without the user asking the agent to start a second watch.
9. After the first event, the watch state visibly rearms for the next review round.
10. The recording endpoint has two prototype variants available for AVP/manual testing, or an implementation note explains why one variant was invalid before testing.
11. One AVP manual acceptance trial completes two review rounds and records which endpoint variant felt better.
12. Automated coverage protects the state transitions, no-false-agent-working copy, watcher auto-rearm, and timestamp/timeline behavior.
13. Reduced-motion users do not receive unnecessary animation; any thinking indicator is accessible and does not spam assistive technology.

## Out of Scope

- Built-in AI response generation.
- Replacing external coding agents.
- Replacing CriticMarkup storage.
- Cloud sync or hosted documents.
- A permanent design-system overhaul.
- A perfect final animation if the reliable loop is not yet truthful.
- Solving every possible AVP selection nuance beyond the recording endpoint prototype and manual acceptance gate.

## Selected Shape

Build one cohesive "Live Voice Review Loop" update rather than isolated fixes.

The selected shape is a right-rail-centered status and activity timeline, backed by real voice and review-event state, plus continuous watcher auto-rearm. The recording endpoint remains a rapid prototype decision with two testable variants. The visual indicator should attempt fast reuse of GJDraw's `ThinkingIndicator`, but the implementation must fall back quickly if reuse becomes a distraction.

This lane keeps Roughdraft as the local review coordinator:

- Browser app: captures selection/audio and renders truthful status/timeline.
- Local server: transcribes, classifies voice intent, writes review events, reports watchers, and logs timings.
- CLI/MCP watcher: stays attached across multiple handoffs.
- External agent: reads Markdown feedback and writes replies.

Likely implementation surfaces:

- `packages/app/src/DocumentWorkspace.tsx`
- `packages/app/src/PageCard.tsx`
- `packages/app/src/api-backend.ts`
- `packages/server/src/review-events.ts`
- `packages/server/src/index.ts`
- `packages/server/src/cli.ts`
- `packages/server/src/mcp.ts`

