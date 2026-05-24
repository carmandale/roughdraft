---
boundary_timestamp: 2026-05-24T130438Z
phase: B
sha: 076453a6
plan_hash: 6f2a1d57
plan_sha256_full: 6f2a1d57096372ee68548bfa53c5c1053924ea9d7f9f56d2f6d4001cd00fc2e4
---

# SPEC-SNAPSHOT-BEGIN
---
title: "Live Voice Review Loop"
date: 2026-05-24
bead: bd-1ny1
---

<!-- issue:complete:v1 | harness: unknown | date: 2026-05-24T11:47:43Z -->

# Live Voice Review Loop

## Source (verbatim)

> "Oh no, you completely missed the whole concept. The whole point of this is naturally speaking, not pasting." - user, 2026-05-24

> "It is not working and I wonder if you're confused about how it works. It currently says transcribing audio. I don't know if you can see the console. There is no dictate button to click that I'm aware of. The way the demo worked online and video is that you just select the text and it automatically starts recording, which is what appears to happen. And whatever you release is when it acts on the recording. In your earlier attempts, it would say no audio detected. In your current attempt, it says transcribing audio, but nothing ever happens." - user, 2026-05-24

> "it doesn't appear to be working. [Image #1] what does the [uncertain] mean? and it did transcribe my audio while on AVP, and it says it is working, but it has been going a long time." - user, 2026-05-24

> "I think one cohesive you expect I can tell that it hears me and that it's working." - user, 2026-05-24

> "include auto rearm as a must-have." - user, 2026-05-24

> "Let's also have time stamps so that we know how long things are taking." - user, 2026-05-24

> "I think so, but we will need to rapid prototype and test this. we won't know the answer until we try it" - user, 2026-05-24

## Problem

PR #85 has the right product concept: selecting text starts recording, the user speaks naturally, and release/clear selection turns the recording into review feedback. The current experience is still not trustworthy enough, especially on Apple Vision Pro, because Roughdraft can be doing real work while the user cannot tell what stage it is in or whether the external agent is actually attached.

The real outcome is not "voice transcription works once." The outcome is a visible loop from speech capture through durable Markdown feedback, truthful watcher handoff, reply/file-change observation, and automatic readiness for the next review round.

## Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | The user can observe one natural voice review action through concrete, accessible states for listening, stopping recording, transcribing, transcript received, classifying action, saving, saved, and failed-with-reason. Active states show elapsed time in a stable visible surface, not only a transient toast. | Core goal |
| R1 | Roughdraft preserves auditable causal identity across the loop: one recording run has an inspectable run/handoff trace binding document path, pre-action file version or content hash, selected text snapshot, save result/version, delivered handoff event, intended watcher provenance, and later reply/file-change observation. Late, stale, or mismatched results are visibly discarded or failed. | Must-have |
| R2 | "Saved" means CriticMarkup feedback was durably written to the Markdown file bound to the recording run at a known version, or the UI shows pending/conflict/failed-save. Done Reviewing/handoff is blocked or explicitly degraded until the saved version containing the feedback is known. | Must-have |
| R3 | Roughdraft separates watcher receipt from agent work. `Agent notified` requires actual `review.completed` delivery to a watcher registered for the active document/session/handoff trace; no-watcher cases say no watcher/agent is attached; `Agent working` is forbidden unless Roughdraft receives a real agent-side signal. | Must-have |
| R4 | CLI watching supports continuous follow/rearm. Any MCP watcher advertised as supporting this review loop either supports equivalent follow/rearm in the same release or is explicitly labeled one-shot/out-of-scope. Rapid back-to-back handoffs must not fall into a rearm gap. | Must-have |
| R5 | After delivered handoff, Roughdraft exposes reply observation honestly: waiting, correlated file change observed after the handoff version, no reply yet, timed out, or watcher disconnected. Version-only detection says the Markdown file changed after handoff and does not claim semantic agent authorship. | Must-have |
| R6 | Timestamps and durations exist for voice processing, durable save, handoff delivery, waiting-for-reply, reply observation, and rearm/disconnect events. Evidence excludes raw audio, API keys, secrets, raw transcript text, and raw selected text by default. | Must-have |
| R7 | The recording endpoint is decided by an AVP/manual prototype report, preferably `specs/001-live-voice-review-loop/avp-endpoint-trial.md`. Desktop testing can de-risk implementation, but cannot stand in for the AVP endpoint decision. An unresolved AVP endpoint blocks feature completion. | Must-have |
| R8 | Verification covers stale result discard, durable save before handoff, false agent-working copy, intended/stale/test watcher provenance, continuous follow/rearm with rapid second handoff, correlated file-change observation, empty transcript/OpenRouter fallback states, reduced-motion/accessibility, and one AVP/manual two-round acceptance trial including correlated post-handoff file-change/reply observation. | Must-have |

## Selected Shape

Shape E: server correlation spine with client voice timeline.

The app owns the live voice micro-states so the interface stays responsive and simple. The server owns only proof-bearing correlation records: run IDs, review-round IDs, handoff IDs, saved versions, watcher provenance, own-save markers, file-change observations, and redacted evidence export.

This is the smallest shaped path that still satisfies the hardened requirements:

- A client-only timeline cannot prove watcher provenance or causal file-change observation.
- A full server event ledger is heavier than needed and risks making ephemeral UI state server-owned.
- Markdown-embedded metadata pollutes the review source of truth.
- Agent acknowledgement callbacks are future protocol work, not this lane.

## Breadboard

### UI Affordances

| ID | Place | Affordance | Wires Out |
|----|-------|------------|-----------|
| U1 | Editor selection | Natural voice capture starts from selected text; selected text snapshot and file version are captured for the run. | N1, U2 |
| U2 | Right rail | App-owned voice timeline shows listening, stopping, transcribing, transcript received, classifying, saving, saved, failed, with elapsed time. | N2, N3, U5 |
| U3 | Selection or right rail endpoint | Endpoint is pluggable: explicit Done/Cancel or auto-clear-only, chosen by AVP report. | N9, U2 |
| U4 | Right rail watcher strip | Shows no watcher, watcher registered, delivered, waiting for file change, file changed after handoff, timed out, rearmed, disconnected, with watcher provenance when available. | N4, N5, N6 |
| U5 | Right rail failure/degraded states | Shows stale result discarded, save conflict, handoff blocked until save, no watcher attached, empty transcript, classification fallback, watch disconnected. | N2, N3, N4, N8 |
| U6 | Evidence surface | Exposes run ID, round ID, handoff ID, key timestamps/durations, saved version, delivered watcher, and file-change version for screenshot/report capture. | N8, N9 |
| U7 | Done Reviewing | Sends the open review round, which can contain one or more saved voice runs. Enabled only when every non-discarded run has saved-version proof. Sending closes the round; the next saved-or-saving voice run opens a new round. | N3, N4, U4, U5 |

### Non-UI Affordances

| ID | Place | Affordance | Wires Out |
|----|-------|------------|-----------|
| N1 | Server review-run API | Creates a run ID for document path, selected text hash, pre-action file version/hash, and created-at time. | U1, N2 |
| N2 | Server review-run API | Records proof-bearing milestones only: transcript received, action classified, save started, saved version, attached to review round, handoff requested, file-change observed, discarded, failed. | U2, U5, N8 |
| N3 | App save path | Existing Markdown save returns a fresh version; app posts that version to the run and open review-round record. Handoff blocks/degrades if any non-discarded run is missing saved-version proof or stale. | N2, N4 |
| N4 | Review-event server | `completeReview` accepts review-round ID and latest saved version only after save proof exists for all attached runs. It emits `review.completed` with handoff ID, round ID, run IDs, saved version, document path, summary, and server handoff timestamp. | U4, U7, N5 |
| N5 | Watcher registry / queue | CLI follow registers watcher provenance for a document and remains registered across delivery until explicit stop/timeout/abort. The next cursor is established before the current event is considered handled. | U4, N4, N7 |
| N6 | Markdown file event correlation | Own-save marker lives in the server correlation record as `saveOperationId`, `savedVersion`, and `savedAt`. Matching own-save/stale events are ignored; later versions after `handoffAt` become `Markdown file changed after handoff`. | U4, N2 |
| N7 | CLI follow JSON | `roughdraft watch --follow --json` prints round ID, run IDs, handoff ID, saved version, watcher session, and rearm/disconnect status. | N5, N8 |
| N8 | Proof export / logs | Redacted trace includes round ID, run IDs, handoff ID, timestamps, durations, versions, watcher provenance, file-change version, discarded runs, and errors. | U6 |
| N9 | AVP prototype report | Records endpoint variant, endpoint action, discoverability, selected/inconclusive result, and two-round proof with correlated post-handoff file-change/reply observation. | U3, U6 |

### Vertical Slice

```text
select text
  -> create run
  -> show voice states
  -> save CriticMarkup
  -> attach saved run to open review round
  -> enable/send Done Reviewing
  -> CLI follow receives round/run/handoff event with watcher provenance
  -> simulate external Markdown edit
  -> correlate later file version after handoff
  -> right rail shows "Markdown file changed after handoff" with timestamps/evidence
```

## Acceptance Criteria

1. Selecting text and speaking produces visible right-rail status through listening, transcription, classification, saving, and saved/failed.
2. Voice runs are bound to document path, selected text snapshot/hash, pre-action version/hash, and saved file version.
3. Stale or abandoned runs are discarded and do not block/send incomplete rounds.
4. Done Reviewing is blocked or degraded until the open review round has saved-version proof for all non-discarded runs.
5. Done Reviewing with no watcher attached uses truthful no-watcher copy.
6. Done Reviewing with watcher attached records delivered watcher provenance and never says `Agent working` without a real agent-side signal.
7. `roughdraft watch --follow --json` receives at least two rapid `review.completed` events for the same document without restarting and without a rearm gap.
8. A post-handoff Markdown file change is correlated after the handoff version and displayed as file change observed, not agent-authored reply.
9. Timing evidence is visible in the UI and available in redacted machine-readable proof.
10. Empty transcript, transcription failure, OpenRouter/fallback uncertainty, save conflict, stale result, no watcher, and watch disconnect all surface concrete states.
11. AVP/manual endpoint trial records variant, endpoint action, discoverability, selected/inconclusive result, and two review rounds including correlated post-handoff file-change/reply observation.
12. Automated tests cover stale result discard, save-before-handoff, false agent-working copy, watcher provenance, no-gap follow/rearm, file-change correlation, failure states, and reduced-motion/accessibility behavior.

## Constraints

- Preserve local-first Markdown and CriticMarkup as the durable review source of truth.
- Do not add a database, cloud backend, hidden review sidecar, or hidden Markdown metadata.
- Keep answer-writing external to Roughdraft.
- OpenRouter may classify voice intent; Roughdraft must not generate, summarize, or pretend to author agent replies.
- Version-only reply detection must use honest copy.
- GJDraw animation reuse is optional; if it is not quick, ship an accessible Roughdraft-native indicator.
- MCP follow/rearm is either implemented with CLI parity or explicitly labeled one-shot/out-of-scope.

## Implementation Watchpoints

- Stale/abandoned run discard must be tested carefully because it controls whether Done Reviewing blocks forever or sends an incomplete round.
- Cross-browser/server timing must avoid false precision across clock boundaries.
- Watcher provenance is not authenticated agent identity; UI copy must reflect that boundary.
- AVP unavailable is a blocker for feature completion, not manual proof.


# SPEC-SNAPSHOT-END

# PLAN-SNAPSHOT-BEGIN

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

Add a tiny server proof helper, not a standalone timeline or ledger abstraction. The helper can be a narrow module with bounded in-memory maps such as `activeRunsById`, `openRoundByDocument`, and `recentHandoffById`, scoped to the current process and one local Markdown document at a time. It records only the fields required to gate Done Reviewing and explain the visible UI: run id, round id, handoff id, document path, redacted selection hash/length, pre-action version, saved version, watcher session, first later file-change version, compact timestamps, status, and pruning deadline. It must not introduce durable storage, append-only events, replay/history queries, cross-document audit views, collaboration semantics, raw content storage, or reply content storage. If implementation needs more fields or a more general abstraction, stop and reshape instead of expanding the helper.

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

The run records only compact proof milestones for recording started, stopping, transcribing, transcript received, classification requested, classification completed, edit applied, save started, saved version, discarded, and failed. These milestones are not a replay log; they are the minimum current-state proof needed to explain the visible loop and gate Done Reviewing. Browser-only timing can stay browser-owned for responsive UI, but proof-bearing milestones sent to the server must be redacted.

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

Post-handoff observation should be server-owned so it is not swallowed by the app's existing reload/conflict handling. After a handoff, the proof helper observes only that handoff's target Markdown file until timeout, disconnect, explicit stop, or pruning. It ignores versions at or before the saved handoff version and records only the first later version plus timing as `Markdown file changed after handoff`.

This observation is intentionally version-only. It must not claim semantic authorship, reply content, or agent action. The right rail and proof export should show the later version, observation timestamp, and elapsed time since handoff.

## UI And Interaction

Move the durable visible loop into the document status area/right rail rather than relying on transient toasts. The surface must show stable timestamps or elapsed durations for active states and preserve a compact evidence view with run id, round id, handoff id, saved version, watcher session, and file-change version.

`PageCard` can keep the live recording mechanics. It should emit run/progress events up to `DocumentWorkspace` or a small local controller so the document-level UI can show one cohesive loop and Done Reviewing can be blocked when save proof is missing.

The AVP endpoint remains undecided until manual testing. The implementation should keep current select-to-record/release-to-act behavior as the default prototype, but leave room for a small explicit Done/Cancel endpoint if the AVP report proves auto-clear is not reliable or discoverable. Feature completion is blocked until `specs/001-live-voice-review-loop/avp-endpoint-trial.md` records the endpoint decision or a truthful blocker.

## Privacy And Evidence

Redacted evidence should include only ids, versions, hashes, lengths, timestamps, durations, watcher provenance, statuses, and error classes needed for the active or recently completed local loop. It must exclude raw audio, API keys, raw transcript text, raw selected text, model-output text, reply text, and general review history by default.

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

Decision impact: because the probe found correlation is new cross-cutting work, `tasks.md ## Group A: Server Correlation And Redaction` must introduce a tiny bounded proof helper and log redaction, while `tasks.md ## Group B: Watcher Follow And Provenance` must add persistent follow watcher sessions instead of only looping current one-shot watch calls.

## Scope Boundaries

In scope:

- Local-file Roughdraft voice review loop.
- Tiny server proof helper in memory for the active running local document and recently closed handoffs needed for visible proof.
- CLI follow as the live-loop watcher path.
- Honest version-only file-change observation.
- Redacted evidence and visible timings.
- AVP endpoint trial artifact and blocker semantics.

Out of scope:

- Agent-authored semantic reply detection.
- Cloud sync, database persistence, or hidden Markdown metadata.
- Append-only review ledgers, replay/history features, collaboration feeds, or cross-document audit surfaces.
- Making OpenRouter or Parakeet smarter beyond existing transcription/classification plumbing.
- Remote/local-storage parity unless required by tests for non-crashing degraded behavior.
- Public PR creation or upstream merge.



# PLAN-SNAPSHOT-END
