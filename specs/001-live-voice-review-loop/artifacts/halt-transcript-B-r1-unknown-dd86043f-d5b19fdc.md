---
halt_timestamp: 2026-05-24T12:55:31Z
phase: B
round: 1
prior_sha: unknown
plan_hash: dd86043f
drift: BLOAT
bypass_status: pending
halt_event_id: unknown-dd86043f
---

## Codex Response

## Per-Source-Entry Verdicts
1. PASS: The plan keeps the core correction that the feature is about natural speech, not pasted text: plan lines 10, 69-70 map directly to source entry 1 at spec line 12 and preserve the objective.
2. PASS: The plan understands the intended interaction: select text, record naturally, release/endpoint acts on the recording, and visible states replace the stuck "transcribing" mystery; see spec lines 14 and 40, plan lines 10, 13, 69-75.
3. PASS: The plan addresses the long-running/uncertain Apple Vision Pro problem by requiring stable status, timing, proof, and an endpoint trial before completion; see spec line 16 and plan lines 67-75, 86-91.
4. PASS: The plan keeps the "I can tell that it hears me and that it's working" outcome as the visible loop headline, with right-rail state and evidence rather than transient toasts; see spec line 18 and plan lines 63-66.
5. PASS: Auto-rearm is not lost: the plan makes continuous `watch --follow --json` the acceptance path and requires two rapid handoffs without a rearm gap; see spec line 20 and plan lines 45-51, 95.
6. PASS: Timestamps are preserved as a first-class requirement: plan lines 63-66 and 86-91 require visible elapsed durations and redacted timing evidence, matching spec line 22.
7. PASS: The plan preserves prototype uncertainty instead of prematurely deciding the Apple Vision Pro endpoint: plan lines 69-75 require manual trial evidence before feature completion, matching spec line 24.

## Delta Classification
- Converts the user’s natural-speech complaint into a vertical-slice goal that includes saved CriticMarkup, watcher handoff, rearm, and honest file-change observation: +1 lines, traced to R0
- Adds a process-local server correlation spine rather than a database or Markdown metadata, matching the selected shape and causal-proof requirements: +5 lines, traced to R1
- Adds explicit save-before-handoff and round-closing rules so Done Reviewing cannot send unsaved voice feedback: +7 lines, traced to R2
- Replaces false "agent working" language with watcher/no-watcher/delivered/file-change states: +7 lines, traced to R3
- Adds `roughdraft watch --follow --json` as the live-loop watcher path and preserves one-shot behavior where appropriate: +7 lines, traced to R4
- Adds version-only post-handoff file-change observation and explicitly forbids claiming agent authorship: +5 lines, traced to R5
- Adds privacy and evidence requirements for hashes, ids, timestamps, durations, and log redaction: +5 lines, traced to R6
- Keeps the Apple Vision Pro endpoint decision blocked on a manual prototype report rather than desktop-only proof: +4 lines, traced to R7
- Defines targeted tests for stale discard, save-before-handoff, watcher provenance, follow/rearm, file-change observation, failure states, accessibility, and Apple Vision Pro proof: +8 lines, traced to R8

## Drift Flags
BANANA: none
BLOAT: Potential watchpoint: `ReviewLoopTracker` and proof records are justified by spec lines 31-36 and plan lines 25-27, but implementation must stay in-memory and proof-only; expanding it into a general collaboration ledger would violate plan lines 18-21 and constraints at spec lines 110-111.
AMBIGUOUS: none

## Halted Plan Draft (verbatim)


---
title: "Live Voice Review Loop"
date: 2026-05-24
bead: bd-1ny1
---

# Live Voice Review Loop Plan

## Goal

Ship the smallest honest vertical slice of the live voice review loop: selected text starts natural voice capture, the resulting CriticMarkup feedback is saved to the bound Markdown file, Done Reviewing hands off a saved review round to a registered watcher, the watcher remains attached for a rapid second round, and the UI exposes timing/proof without claiming the agent replied unless only a file change was observed.

## Shape Comparison

### Shape E: Server Correlation Spine With Client Voice Timeline

This is the selected shape. The browser owns responsive voice micro-states: listening, stopping, transcribing, transcript received, classifying, applying, saving, saved, failed, and stale/discarded. The server owns proof-bearing state only: run ids, round ids, handoff ids, redacted selected-text metadata, pre-action version, saved version, watcher provenance, post-handoff file-change observation, and redacted timing evidence.

This shape fits the repo because ADR 0001 keeps one Markdown file as the unit of work, ADR 0002 keeps CriticMarkup as the portable review format, and ADR 0004 permits transient in-memory process state without turning the state file into a database.

### Client-Only Timeline

A client-only timeline would be quicker in the UI, but it cannot prove watcher provenance, saved-version handoff, no-gap follow, or post-handoff file-change correlation. It would be too easy to satisfy the visual goal while leaving the user's false-positive traps intact.

### Full Server Ledger

A full server-owned timeline would simplify reload recovery and audit centralization, but it would move transient voice UI into the server and expand the feature into a local collaboration ledger. That is heavier than the shaped requirement and risks violating the "no hidden review sidecar/database" constraint.

## Architecture

Add a small in-memory `ReviewLoopTracker` under the server package. It should be process-local, project/file scoped, redacted by default, and independent of the server state file. It should track review runs, open review rounds, handoffs, watcher sessions, and post-handoff file-change observations. It should not store raw audio, raw transcripts, raw selected text, API keys, or model output text in proof records.

Keep existing voice transcription and OpenRouter inference paths, but change existing `logVoice` calls so diagnostic logs use lengths, hashes, ids, durations, statuses, and error classes rather than transcript, utterance, selected text, or model-content previews.

Extend the current review-event queue instead of replacing it. One-shot waiters continue to work for existing `roughdraft watch` and MCP calls. A new follow watcher session remains registered between event deliveries, so rapid second handoffs count as delivered to the intended watcher even if the CLI is printing the previous JSON line.

Extend local-file backend APIs only for the proof-bearing loop. Local-storage, preview, and remote backends can continue returning degraded/undelivered behavior unless a later spec explicitly asks for parity.

## Review Run And Round Model

A voice review run starts when the browser has a selected text snapshot for an editable local Markdown document. The run is bound to:

- document path and project path,
- selected text hash and length, not raw selected text,
- selection range,
- pre-action file version or content hash,
- browser-created timestamp and server-created timestamp.

The run records milestones for recording started, stopping, transcribing, transcript received, classification requested, classification completed, edit applied, save started, saved version, discarded, and failed. Browser-only timing can stay browser-owned for responsive UI, but proof-bearing milestones sent to the server must be redacted.

The first saved-or-saving non-discarded run opens a review round. A round may contain one or more saved voice runs. Done Reviewing closes the open round only after every non-discarded run in the round has saved-version proof. The next saved-or-saving voice run opens the next round.

## Handoff And Watcher Truth

`completeReview` should accept the review round id and latest saved version. The server validates that the round belongs to the target Markdown file and that every non-discarded run has saved-version proof before emitting `review.completed`.

The review event payload should include handoff id, round id, run ids, saved version, handoff timestamp, summary, and delivered watcher provenance. Delivery means the event was delivered to either an active one-shot waiter or an active follow watcher session for this exact document/project. It does not mean an agent is working.

The UI copy must remove `Your agent is now working`. Truthful states are watcher registered, handoff delivered, no watcher attached, waiting for file change, Markdown file changed after handoff, timed out, disconnected, and failed.

## CLI And MCP Scope

Add `roughdraft watch --follow --json` as the primary live-loop agent surface. It should register a watcher session, emit newline-delimited JSON events for each handoff, retain the same session across deliveries, and exit only on explicit interrupt, timeout, server error, or document/session invalidation.

Keep `roughdraft watch` and default `roughdraft open` backward compatible as one-shot unless implementation evidence shows follow can be added without breaking current agent usage. If `open` stays one-shot, its help and docs must not imply live-loop auto-rearm.

MCP can remain one-shot in this lane, but it must be explicitly labeled as one-shot/out-of-scope for the live voice loop in tool descriptions, docs, or verification notes. If implementation time makes MCP parity cheap and testable, it may be upgraded, but CLI follow is the acceptance path.

## File-Change Observation

Post-handoff observation should be server-owned so it is not swallowed by the app's existing reload/conflict handling. After a handoff, the tracker observes the target Markdown file until timeout, disconnect, or explicit stop. It ignores versions at or before the saved handoff version and records only later versions as `Markdown file changed after handoff`.

This observation is intentionally version-only. It must not claim semantic authorship, reply content, or agent action. The right rail and proof export should show the later version, observation timestamp, and elapsed time since handoff.

## UI And Interaction

Move the durable visible loop into the document status area/right rail rather than relying on transient toasts. The surface must show stable timestamps or elapsed durations for active states and preserve a compact evidence view with run id, round id, handoff id, saved version, watcher session, and file-change version.

`PageCard` can keep the live recording mechanics. It should emit run/progress events up to `DocumentWorkspace` or a small local controller so the document-level UI can show one cohesive loop and Done Reviewing can be blocked when save proof is missing.

The AVP endpoint remains undecided until manual testing. The implementation should keep current select-to-record/release-to-act behavior as the default prototype, but leave room for a small explicit Done/Cancel endpoint if the AVP report proves auto-clear is not reliable or discoverable. Feature completion is blocked until `specs/001-live-voice-review-loop/avp-endpoint-trial.md` records the endpoint decision or a truthful blocker.

## Privacy And Evidence

Redacted evidence should include ids, versions, hashes, lengths, timestamps, durations, watcher provenance, statuses, and error classes. It must exclude raw audio, API keys, raw transcript text, raw selected text, and model-output text by default.

The implementation must fix existing `[voice]` console logging that currently includes previews. A new proof surface is not sufficient if old logs still leak raw text.

## Verification Plan

Use fast behavioral tests at the seams where the loop can lie:

- server tests for run/round proof, save-before-handoff validation, redaction, watcher provenance, and file-change observation,
- queue/CLI tests for `watch --follow --json` receiving two rapid handoffs without a rearm gap,
- app component tests for voice timeline states, stale/discarded runs, save-blocked handoff, truthful handoff copy, and evidence display,
- existing save-controller tests as the base for flush-before-handoff behavior,
- a browser or integration test only where filesystem/SSE behavior must be proven end to end.

Before code verification can pass, run the relevant targeted tests plus `pnpm check`. Manual AVP proof is required for final feature completion.

## Plan Sanity Evidence

Objective: deliver a truthful local-file voice review loop where spoken feedback becomes saved CriticMarkup, watcher handoff is provenance-backed, auto-rearm is proven, and post-handoff observation never overclaims agent work.

Riskiest assumption: a process-local server correlation spine can prove run, round, handoff, watcher, and file-change causality without adding a database, hidden Markdown metadata, or a full server-owned voice timeline.

Smallest probe: Phase A source-seam inventory read `/tmp/codex-plan-research-b3aa37c1.md` lines 83-98 after inspecting PageCard voice capture, server voice sessions, save flush, review events, CLI/MCP watch, file SSE, and existing tests; baseline command `pnpm --filter @roughdraft/server exec vitest run src/review-events.test.ts src/index.test.ts src/cli.test.ts src/mcp.test.ts --testNamePattern "review events|watch|voice"` was also run.

Observed result: the baseline command exited 0 with 4 server test files passed, 14 matching tests passed, and 80 tests skipped by filter; the source inventory showed current voice sessions are transcription-only, watcher delivery is one-shot, logs leak previews, and file events expose only path/version.

Decision impact: because the probe found correlation is new cross-cutting work, `tasks.md ## Group A: Server Correlation And Redaction` must introduce a dedicated tracker and log redaction, while `tasks.md ## Group B: Watcher Follow And Provenance` must add persistent follow watcher sessions instead of only looping current one-shot watch calls.

## Scope Boundaries

In scope:

- Local-file Roughdraft voice review loop.
- Server proof records in memory for the running local session.
- CLI follow as the live-loop watcher path.
- Honest version-only file-change observation.
- Redacted evidence and visible timings.
- AVP endpoint trial artifact and blocker semantics.

Out of scope:

- Agent-authored semantic reply detection.
- Cloud sync, database persistence, or hidden Markdown metadata.
- Making OpenRouter or Parakeet smarter beyond existing transcription/classification plumbing.
- Remote/local-storage parity unless required by tests for non-crashing degraded behavior.
- Public PR creation or upstream merge.



