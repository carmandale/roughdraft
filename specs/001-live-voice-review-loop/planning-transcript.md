<!-- plan:complete:v1 | harness: unknown | date: 2026-05-24T13:05:19Z -->

## Phase A (Research Challenge) — Round 1

1. **Protocol Check**

The research packet avoided Phase A plan/task contamination. I saw high-level direction only, not task IDs, sequencing, final plan prose, or file-by-file change lists. Minor caution: `/tmp/codex-plan-research-b3aa37c1.md:70` makes an MCP scope call; that is acceptable as research direction, but Phase B must make the product-visible limitation explicit if MCP stays one-shot.

2. **Missing Research**

The packet is not grounded enough for Phase B yet. It needs bounded follow-up on these paths:

- Voice logging/privacy: spec R6 forbids raw transcript/selection evidence by default, but current server logs transcript, utterance, selected text, and content previews in [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1179), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1247), and [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1264).
- Voice run identity: current server “voice sessions” are transcription upload sessions created after recording stops and deleted on stop, not document-bound review runs: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1107), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1162). The packet treats them as proof-bearing infrastructure too casually.
- Save-before-handoff: `handleCompleteReview` saves before `completeReview`, but the research has not proven voice-applied CriticMarkup is flushed and bound to the saved version for the active run: [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1762).
- Watcher provenance: current delivery is “any matching waiter got the event,” and waiters are deleted on resolve: [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:78), [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:157). Planning needs the intended/stale/test watcher rule.
- File-change observation: current SSE exposes only path/version and app reload/conflict behavior already consumes those events: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:979), [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1796). The plan needs to prove correlation does not get swallowed by existing reload logic.
- Test surface: I found no `PageCard` voice tests via `rg` in `packages/app/test/page-card.test.tsx`; existing watcher tests are one-shot. Phase B needs exact test seams, not just “existing tests cover useful seams.”

3. **Assumption Challenge**

Most likely false or under-proven: “the server already has in-memory voice sessions, so proof-bearing run/round state can live there” from `/tmp/codex-plan-research-b3aa37c1.md:44`-`49`.

Current voice sessions are audio-transcription transport state, not causal review-loop state. They do not start at selection time, do not know document path/pre-version/selection hash, and are deleted before handoff. That means the proposed correlation spine is a new cross-cutting mechanism, not a small extension of existing voice sessions.

4. **Product Truth Challenge**

The eventual implementation could still fake success if it:

- Shows a polished right-rail timeline while the trace is just client state, not proof that the saved Markdown version contains the CriticMarkup before handoff.
- Marks “delivered” because any watcher received `review.completed`, while the intended external agent is absent.
- Shows “Markdown changed after handoff” for user/manual/tool churn and lets that feel like a reply loop.
- Passes desktop automation while AVP still gets stuck at “Transcribing audio...” or has an unusable release/clear endpoint.
- Emits “redacted evidence” in a new surface while existing `[voice]` console logs still leak raw text previews.

5. **Plan Readiness**

`NOT_READY`.

Bounded required research before Phase B: inspect and cite the exact voice/session, save flush, review-event watcher, CLI/MCP watch, file-event correlation, and redacted logging paths above; run or define one narrow probe proving the riskiest correlation claim; inventory the existing tests and name the missing behavioral tests needed for save-before-handoff, no-gap follow, stale discard, privacy redaction, and AVP/manual proof.

## Phase A (Research Challenge) — Round 2

1. **Protocol Check**

The packet avoided plan/task contamination. It contains research findings, high-level direction, risks, and assumptions. I did not see task IDs, sequencing, final plan prose, or a file-by-file change list.

2. **Missing Research**

The planning agent needs more source-grounding before Phase B:

- Current voice “sessions” are transcription transport state, not proof-bearing review runs: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1107), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1162).
- Current voice logs leak transcript/utterance/selection/output previews, conflicting with spec R6’s redaction requirement: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1179), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1247), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1264).
- Save-before-handoff is under-proven. `handleCompleteReview` saves before handoff, but the packet does not prove voice-applied CriticMarkup is flushed and bound to the saved version: [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1762).
- Watcher provenance is not yet real. Current delivery means any matching waiter received the event, then the waiter is removed: [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:78), [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:157).
- File-change correlation must account for existing SSE reload/conflict behavior: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:979), [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1796).
- Existing UI screenshot docs still encode false “agent working” copy: [ui-state-screenshot-guide.md](/Users/dalecarman/dev/roughdraft/docs/spec/ui-state-screenshot-guide.md:106).

3. **Assumption Challenge**

Most under-proven assumption: that the existing in-memory server state can become a “correlation spine” without effectively adding a new ledger. Current server state does not bind selection, document version, saved CriticMarkup, handoff ID, watcher provenance, and later file change. That mechanism is new and cross-cutting.

4. **Product Truth Challenge**

The implementation could still fake success by showing a credible timeline while only proving local UI milestones; delivering to a stale/test watcher; treating any later file version as reply progress; passing desktop tests while AVP remains stuck; or adding a redacted proof export while existing console logs still leak raw text.

5. **Plan Readiness**

`NOT_READY`

Bounded required research: cite the exact source seams for voice run creation, save flush/version binding, watcher identity, follow/rearm behavior, file-change correlation, redacted evidence, MCP/CLI scope, and current tests. Run or document one smallest probe that could falsify the correlation-spine assumption before drafting Phase B.

## Phase A (Research Challenge) — Round 3

1. **Protocol Check**

The research packet avoided Phase A contamination. It has findings, high-level direction, and risks, but no task breakdown, implementation ordering, final plan prose, or file-by-file change list.

2. **Missing Research**

The packet is not source-grounded enough for Phase B. Required bounded research:

- Prove how proof-bearing voice run identity differs from current transcription-only sessions in [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1107).
- Inspect current redaction/privacy gaps: voice logging currently emits transcript, utterance, selected text, and output previews in [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1179), [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1247), and [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1264).
- Verify save-before-handoff actually binds voice-added CriticMarkup to a saved file version, not just that `handleCompleteReview` saves before `completeReview`: [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1762).
- Define watcher provenance beyond “some waiter received the event”; current queue resolves any matching waiter and deletes it: [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:78), [review-events.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/review-events.ts:157).
- Account for current markdown-file SSE reload/conflict behavior before claiming post-handoff file-change correlation: [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:979), [App.tsx](/Users/dalecarman/dev/roughdraft/packages/app/src/App.tsx:1796).
- Include docs/screenshot blast radius; current screenshot guide still expects “Your agent is now working”: [ui-state-screenshot-guide.md](/Users/dalecarman/dev/roughdraft/docs/spec/ui-state-screenshot-guide.md:106).

3. **Assumption Challenge**

Most under-proven assumption: the “server correlation spine” can be added as a lightweight extension of existing server state. Current server voice state is not a review-run ledger; it does not bind document path, selection hash/snapshot, pre-action version, saved version, handoff, watcher provenance, and later file-change observation.

4. **Product Truth Challenge**

The implementation could still fake success by showing timeline states without proving the saved Markdown contains the feedback, delivering to a stale/test watcher, treating unrelated file churn as reply progress, passing desktop automation while AVP remains unresolved, or creating a new redacted proof surface while old logs still leak raw text.

5. **Plan Readiness**

`NOT_READY`

Bounded required research: source-cite the exact seams for voice run creation, save/version binding, watcher identity, CLI/MCP follow behavior, file-change correlation, privacy redaction, and existing test coverage; then run or document one smallest probe that could falsify the correlation-spine assumption.

## Phase A (Research Challenge) — Round 4

1. Yes. The revised `Source Seam Inventory For Phase B` now cites the exact seams requested: voice run creation/transport at `/tmp/codex-plan-research-b3aa37c1.md:83`-`84`, save/version binding at `86`-`88`, watcher identity/provenance at `89`-`91`, CLI/MCP follow behavior at `92`-`94`, file-change correlation at `95`, privacy redaction at `85`, docs blast radius at `96`, and existing tests at `97`-`98`.

2. Yes. The probe definition at `100`-`111` is now a real smallest falsifying probe for the correlation-spine assumption: it tests run binding, saved-version proof, watcher provenance, post-handoff file-change truthfulness, and redaction. It is a probe scenario, not task contamination.

3. No remaining Phase A blocker. The probe is defined rather than executed, but that is enough for Phase A; Phase B must carry it into plan sanity evidence/verification design.

4. `READY_FOR_PHASE_B`

## Phase B (Plan Draft Review) — Round 1

Completeness/correctness: the plan addresses R0-R8: visible timeline, causal run/round proof, save-before-handoff, truthful watcher copy, CLI follow/rearm, version-only file-change observation, redacted timing evidence, AVP blocker semantics, and automated/manual verification are all represented in plan lines 171-239 and tasks lines 283-329.

Risks/missing steps: no blocking gap. The main scope risk is that `ReviewLoopTracker` could grow into a full ledger, but the plan constrains it to process-local proof records and keeps raw text/audio out of evidence at lines 171-177 and 223-227.

8. Three riskiest assumptions verified against source:
- Existing voice session is not enough and new run identity is needed: source cited in draft at lines 83-84; plan handles it at lines 181-190.
- Save/version binding can use existing save seams but needs run/round proof: source cited at lines 86-88; plan handles it at lines 191-196 and tasks T15-T16.
- Current watcher behavior is one-shot and needs follow provenance: source cited at lines 89-94; plan handles it at lines 193-207 and tasks T6-T11.

9. Skeptical senior objection: this may be too broad for one slice. The response is acceptable: the plan keeps semantic agent reply detection, remote parity, database persistence, and hidden metadata out of scope at lines 264-270.

10. Production system needs not addressed: authenticated agent identity, durable recovery across server restart, semantic reply attribution, and remote/backend parity. Those are correctly out of scope for this local proof-bearing loop.

11. Scope vs spec: no spec requirement is dropped. MCP parity is allowed to be explicitly one-shot/out-of-scope per R4, and the plan does that at lines 207 and 298.

12. Could approval still allow a listed false positive? No. The plan blocks spec/plan-only success through required implementation proof, removes false `agent working` copy, requires follow/rearm, and treats AVP unresolved as a completion blocker.

13. R0 Shape Comparison gate: passes. `## Shape Comparison` exists and compares Shape E, client-only timeline, and full server ledger at lines 153-168.

14. Plan Sanity Evidence gate: passes. `## Plan Sanity Evidence` has the five labeled lines at lines 241-251; observed result includes an executable command and exit/pass counts; decision impact names specific downstream task groups.

VERDICT: APPROVED

## Phase B — Boundary SHA: 076453a6 — Snapshot: boundary-B-076453a6-6f2a1d57.md
## Phase B — North-Star Check — Round 3 — BOOTSTRAP
## Phase B (Plan Draft Review) — Round 2

The revision addresses the north-star bloat risk. `ReviewLoopTracker` is now framed as a bounded proof cache, not a ledger: process-local, current local-file loop scoped, recently closed handoffs only, no durable storage, no append-only stream, no replay/history queries, no collaboration feed, and no cross-document audit surface. That boundary is explicit in the architecture and scope sections, and it is carried into T3 and T19.

Remaining watchpoint: T4’s “reading review-loop status/proof” endpoint must stay document/current-loop scoped. If implementation turns that into a broad query surface, it would violate Shape E. The current plan language is bounded enough to prevent that if followed.

R0-R8 are still covered: natural select-to-record remains the default flow, visible timings and evidence are required, save-before-handoff gates Done Reviewing, false `agent working` copy is removed, CLI follow/rearm is the live-loop watcher path, file-change observation is version-only, privacy redaction fixes existing logs, and AVP/manual proof remains a completion blocker.

VERDICT: APPROVED
## Phase B (Plan Draft Review) — Round 3

The revision now resolves the remaining abstraction risk. The plan no longer asks for a broad `ReviewLoopTracker`; it specifies a tiny process-local proof helper with bounded maps for active runs, one open round per document, recent handoffs, saved-version proof, redacted milestones, and pruning. It explicitly forbids durable storage, append-only event logs, replay/history queries, collaboration feeds, cross-document audit surfaces, raw content storage, and reply content storage.

Shape E is preserved: the browser keeps live voice micro-states, while the server stores only the minimum proof needed to gate Done Reviewing and explain the visible loop. T3 and T19 now carry that boundedness into implementation, and scope boundaries continue to exclude ledgers, collaboration feeds, hidden metadata, remote parity, and semantic reply detection.

R0-R8 remain covered: select-to-record is preserved, visible timings are required, save-before-handoff gates Done Reviewing, false `agent working` copy is removed, CLI follow/rearm is explicit, file-change observation stays version-only, privacy redaction fixes existing logs, and AVP/manual proof remains a blocker for completion.

VERDICT: APPROVED
