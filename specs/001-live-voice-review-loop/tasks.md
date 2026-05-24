---
title: "Live Voice Review Loop"
date: 2026-05-24
bead: bd-1ny1
---

<!-- plan:complete:v1 | harness: unknown | date: 2026-05-24T13:05:19Z -->
<!-- Codex Review: APPROVED after 1 round | model: gpt-5.5 | date: 2026-05-24 | trust_level: full | round_records: .codex-round-db2e79cc/ | Status: REVISED -->

# Live Voice Review Loop Tasks

## Group A: Server Correlation And Redaction

- [x] T1: Add failing server tests for a redacted review-run lifecycle: create run with document path, selection hash/length, pre-action version, record milestones, mark saved version, and export proof without raw transcript or selected text.
- [x] T2: Add failing server tests proving current voice/log privacy hazards are removed: transcript, utterance, selected text, and model-output previews must not appear in default `[voice]` logs or proof output.
- [x] T3: Implement a tiny process-local proof helper with bounded maps for active runs, one open round per document, recent handoffs, saved-version proof, redacted milestones, discarded/failed runs, TTL/pruning, and compact proof export; do not add durable storage, append-only event logs, replay/history queries, collaboration feeds, or cross-document audit surfaces.
- [x] T4: Add local-file API endpoints for creating review runs, recording milestones, attaching saved versions to open rounds, reading review-loop status/proof, and completing a saved review round.
- [x] T5: Update existing voice transcription and inference logging so diagnostics preserve lengths, ids, durations, statuses, hashes, and error classes without raw content previews.

## Group B: Watcher Follow And Provenance

- [x] T6: Add failing queue/server tests for watcher sessions: intended watcher provenance, stale/test watcher visibility, aggregate status with session details, and delivery to a registered follow watcher.
- [x] T7: Extend the review-event queue or adjacent watcher registry so follow watcher sessions remain registered across deliveries until explicit stop, timeout, abort, or server cleanup.
- [x] T8: Extend `review.completed` event payloads and status responses with handoff id, round id, run ids, saved version, handoff timestamp, watcher session id/source/startedAt/lastDeliveredAt, and truthful delivery state.
- [x] T9: Add `roughdraft watch --follow --json` tests for two rapid Done Reviewing events on the same document without restarting and without losing delivery provenance.
- [x] T10: Implement `roughdraft watch --follow --json` as newline-delimited JSON follow mode, preserving existing one-shot `watch` and `open` behavior unless explicitly changed with tests.
- [x] T11: Update MCP tool description, help, and tests to either expose equivalent follow semantics or explicitly label MCP review watching as one-shot/out-of-scope for the live voice loop.

## Group C: App Timeline And Save-Before-Handoff

- [x] T12: Add PageCard/DocumentWorkspace component tests for selection-driven voice timeline states: listening, stopping, transcribing, transcript received, classifying, applying, saving, saved, failed-with-reason, and stale/discarded run.
- [x] T13: Extend storage types and `ApiBackend` for review-run creation, redacted milestone reporting, saved-version binding, review-loop status/proof, and round-aware completeReview.
- [x] T14: Wire PageCard voice capture/action flow to create or update a proof-bearing run while keeping transient live states responsive and client-owned.
- [x] T15: Bind voice-applied CriticMarkup to save proof: flush or observe the save path after action application, record the saved file version on the run/round, and visibly fail or block when save conflicts or save errors occur.
- [x] T16: Change Done Reviewing gating so it sends a review round only when every non-discarded run has saved-version proof; no-watcher and missing-save cases must use explicit degraded copy.
- [x] T17: Replace false handoff copy such as `Your agent is now working` with watcher/file-change truth in app UI and screenshot-state docs.

## Group D: File-Change Observation And Evidence UI

- [x] T18: Add server tests for post-handoff file-change observation that ignores own-save/stale versions and records only later Markdown versions as `Markdown file changed after handoff`.
- [x] T19: Implement bounded post-handoff observation in the proof helper/server so the first later file-change proof for the active handoff is captured independently of the app reload/conflict path, then stopped or pruned.
- [x] T20: Add app tests for waiting, file-changed-after-handoff, timeout, disconnected, and failed observation states with elapsed time and reduced-motion-safe rendering.
- [x] T21: Build the compact document-level timeline/evidence surface with run id, round id, handoff id, saved version, watcher provenance, file-change version, timestamps, durations, and redacted failure details.
- [x] T22: Ensure local-storage, preview, and remote backends degrade honestly without claiming watcher delivery, saved proof, or live-loop support.

## Group E: AVP Endpoint Trial And Manual Acceptance

- [x] T23: Create `specs/001-live-voice-review-loop/avp-endpoint-trial.md` with endpoint variant, endpoint action, discoverability, transcript behavior, timing evidence, two-round watcher proof, post-handoff file-change/reply observation, and selected/inconclusive result fields.
- [x] T24: Prototype the default select-to-record/release-to-act endpoint through the new timeline; if AVP testing shows it is unreliable, implement the smallest visible Done/Cancel fallback needed to complete the trial.
- [ ] T25: Run or coordinate the AVP two-round manual trial and record the result; if AVP access or endpoint reliability blocks completion, record the blocker and do not mark implementation complete.

## Group F: Verification And Implementation Receipt

- [x] T26: Run targeted server tests for the review-loop proof helper, review events, CLI follow, MCP scope, voice privacy, and file-change observation.
- [x] T27: Run targeted app tests for PageCard voice flow, save-before-handoff, DocumentWorkspace copy/status, evidence timeline, degraded backends, and reduced-motion/accessibility behavior.
- [x] T28: Run the narrow browser/integration test needed to prove local file save, handoff, follow watcher delivery, and post-handoff file-change observation work together.
- [x] T29: Run `pnpm check` after targeted tests are green.
- [ ] T30: Create `specs/001-live-voice-review-loop/implement-receipt.md` with changed files, commands run, AVP/manual proof status, known limitations, and gate results, then run `gate.sh record implement` and `gate.sh verify implement`.
