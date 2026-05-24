<!-- shape:complete:v1 | harness: unknown | date: 2026-05-24T12:33:27Z -->

## Phase A (R Challenge) — Round 1

**Protocol Check**

No protocol violation in `/tmp/codex-shape-r-2538c51c.md`: I found requirements and ambiguity prompts only, with no Phase A shape material in that context file. One contamination risk: the source spec itself already contains a "Selected Shape" section at `specs/001-live-voice-review-loop/spec.md:118`, so Phase A should avoid treating that upstream section as authority.

**Requirements Challenge**

The biggest gap: the R's protect "watcher notified," but not "agent reply happened." The frame says the loop should stay alive through an external-agent reply, and the source acceptance expects `Reply added`, but R0-R9 never explicitly require reply detection, reply timeout, or a failed/no-reply state. All R's could pass while the agent is notified twice and never answers.

R0 is too subjective. "The user can tell" and "appearing stuck or silent" need observable states, timeout thresholds, visible placement, and accessibility behavior. Otherwise a spinner plus copy could satisfy it while still being untrustworthy.

R1/R2 conflate watcher delivery with agent awareness. Current delivery means a long-poll waiter received `review.completed`, not that an external coding agent read it, started work, or can reply. If the honest boundary is only watcher receipt, the requirement should name it that way and prohibit stronger copy.

R3 is underdefined. "Auto-rearm or follow" could mean CLI loop, MCP tool behavior, browser polling, server queue retention, or agent-side instructions. "At least two" is also weak: should the watch continue until user cancels, server exits, timeout, or document closes?

R4 conflicts with R6 unless retention is defined. Timestamps and elapsed durations need a home: ephemeral UI, server logs, Markdown, or derived events. If hidden sidecars are prohibited, the requirement must say what survives reload and what is intentionally transient. It also misses privacy: timing/logs must not expose transcripts, selections, secrets, or API keys.

R5 is a process gate, not a product requirement as written. It should define the AVP test environment, pass/fail signal, artifact required, and whether both variants must be implemented or merely prototyped. Otherwise "considered" is not verifiable.

R6 is good as a constraint, but it needs one more edge: "saved feedback" must mean durable Markdown write success, or visibly pending/failed save. The UI could otherwise say saved after local editor mutation while disk write or conflict handling failed.

R7 is right, but it leaves the boundary fuzzy. Roughdraft must not become the responder, but can it infer reply state, invoke MCP, summarize agent output, or classify reply intent? Define "external agent" and allowed coordination.

R8 smuggles implementation detail. GJDraw reuse should not be a requirement. Accessibility and reduced-motion behavior should be Must-have for any indicator that ships, not bundled under a Nice-to-have visual polish item.

R9 is redundant and too bundled. It overlaps R0-R5 and mixes automated coverage, manual AVP proof, false-copy checks, and `[uncertain]` behavior. Split it into specific acceptance requirements, especially because `[uncertain]` may be a valid degraded state if explained.

**Direct Answers**

A. Unaddressed failure mode: a late transcript/classification result applies feedback to the wrong selection or wrong document after the user changes selection, switches files, or starts another recording.

B. If all R's were met, Roughdraft could still show honest statuses, notify a watcher twice, and record timings, while the actual feedback is wrong, not durably saved, or never answered by the external agent.

C. The unverified shared assumption is that watcher delivery is a reliable proxy for an attached external agent that will continue the review loop. Current code supports watcher receipt; it does not prove agent attention or reply capability.

**What I Verified**

I read the Phase A context at `/tmp/codex-shape-r-2538c51c.md:31`-`44`, the source spec at `specs/001-live-voice-review-loop/spec.md:37`-`105`, and checked current watcher behavior. The queue resolves and removes a waiter after delivery in `packages/server/src/review-events.ts:157`-`160`; CLI watch posts once and returns after one response in `packages/server/src/cli.ts:2080`-`2114`; current UI can still say "Your agent is now working" from browser-side handoff state in `packages/app/src/DocumentWorkspace.tsx:401`-`412`.

## Phase A (R Challenge) — Round 2

**Protocol Check**

No protocol violation in `/tmp/codex-shape-r-2538c51c.md`: the Round 2 context contains frame, revised requirements, and ambiguity prompts only. The forbidden shape terms did not appear in that context file.

**Round 1 Gap Check**

The revision fixed several big gaps: R1 covers stale voice results, R2 covers durable save/conflict state, R3 separates watcher receipt from agent work, R4 tightens continuous follow, R5 adds honest reply/no-reply states, and R6 adds timing privacy. Much better.

The remaining weakness is causality. The requirements now list the right states, but they still do not require a provable chain tying one recording run to one saved Markdown version, to one handoff event, to one later observed reply/change.

**Requirements Challenge**

R2 and R3 need an ordering requirement. The implementation could show a pending/conflict state, still allow Done Reviewing, deliver `review.completed`, and have the watcher read a Markdown version that does not contain the voice feedback. Add: handoff must be blocked or clearly degraded until the saved file version containing the feedback is known.

R5 is still vulnerable to unrelated file changes. It says not to claim semantic certainty if detection is only file-version change, which is good, but it does not require filtering out Roughdraft's own save, autosave churn, user edits, formatter changes, or an old event. "Reply/file-change observed" needs correlation to the specific delivered handoff.

R1 binds to document, selection, and recording run, but not clearly to document version or selected text snapshot. If the same selection range now contains different text, a late result can still be wrong while satisfying "same selection." Bind to selected text plus pre-action document version or content hash.

R4 is improved but too narrow: "the watcher path used by the manual acceptance test" can be gamed. If CLI passes but MCP remains one-shot, is that acceptable? If yes, name CLI as the slice. If no, require all advertised watcher entrypoints that agents are told to use.

R4 also needs a "no missed event during rearm" requirement. A watcher can receive two events in a happy path while still having a rearm gap that drops a fast second handoff.

R6 says timing data must be "available," but not what evidence must exist after the fact. If a timing bug occurs and the transient UI is gone, what proves the timeline? Define minimum retained evidence for manual acceptance and debugging.

R6 privacy is still vague around "unnecessary transcript/selection text." Current voice debugging is exactly where previews tend to leak. Say whether transcript and selection snippets are prohibited by default, redacted, length-limited, or opt-in only.

R7 is better, but "recorded artifact" is not defined. Notes, screenshots, video, logs, or a Markdown report could all satisfy that phrase. Also: a desktop fallback should not satisfy an AVP-specific endpoint decision unless the requirement explicitly downgrades the claim.

R8 is a grab bag. External answer-writing boundary and visual indicator accessibility are different requirements. Accessibility/reduced-motion should apply to R0/R6 status surfaces generally, not only "any visual indicator."

The old R9 was removed rather than split. There is now no explicit automated coverage requirement for the riskiest transitions: stale result discard, durable save before handoff, false agent-work copy, continuous rearm, and file-change-not-semantic-reply. That is a regression in the requirements set.

**Direct Answers**

A. Unaddressed failure mode: a handoff is delivered for a Markdown version that does not yet contain the saved voice feedback, so the external watcher is honestly notified but reads the wrong file state.

B. If all R's were met, Roughdraft could still pass the manual path while MCP remains broken, treat an unrelated file change as "reply observed," or produce no durable evidence after a timing/privacy failure.

C. The unverified shared assumption is that file version changes plus watcher delivery are enough to reconstruct the whole causal loop without an explicit handoff/run correlation ID.

**What I Verified**

I read the revised context at `/tmp/codex-shape-r-2538c51c.md:31`-`43` and checked the negative contract with a case-insensitive search for the forbidden terms. I focused this challenge on the revised R's, especially R1-R6 and the ambiguity list at `/tmp/codex-shape-r-2538c51c.md:47`-`52`.

## Phase A (R Challenge) — Round 3

**Protocol Check**

No protocol violation in `/tmp/codex-shape-r-2538c51c.md`. I found Round 3 requirements and ambiguity prompts only; the negative-contract terms did not appear in the context file.

**Requirements Challenge**

The causality chain is now explicit enough as an intent: R1 ties recording run, document identity, pre-action version/hash, selected text, save version, handoff event, and reply observation. The remaining risk is that it does not say what artifact proves that chain. "Preserve causal identity" is verifiable only if there is a run/handoff ID, event payload, timeline entry, or test fixture that can be inspected end to end.

Save-before-handoff is mostly fixed. R2 requires the saved version containing feedback before normal handoff. The remaining gap: it says "active Markdown file," which can be wrong if the user switches documents while processing. This should be "the Markdown file bound to the recording run," not whatever is active at handoff time.

No-missed-rearm is now stated well in R4, but CLI/MCP scope is still the most gameable part. "Every watcher entrypoint advertised to agents as part of this feature" is good only if the feature's advertised entrypoints are fixed before implementation. Otherwise an implementation can advertise only the CLI path, pass acceptance, and leave MCP quietly inferior. If MCP is not in scope, that needs to be an explicit product limitation, not just documentation fine print.

R5's correlated reply/file-change requirement is close, but still allows a weak version-only implementation to pass while providing little user value: "file change observed" after handoff is honest, but the loop can still feel dead if every reply is only an anonymous file-change event. That may be acceptable, but the requirement should name the minimum useful user-facing copy for that state.

Timing/privacy is much more concrete. The only challenge: "structured server log events" may smuggle an implementation mechanism unless the requirement is really "machine-readable timing evidence." Some relevant events are browser-only unless the browser reports them to the server. Require the evidence, not necessarily the storage path.

R7's preferred artifact path is fine as a convention, but "selected endpoint" may be too strong. The AVP prototype may produce "inconclusive, keep endpoint unresolved." If that is allowed, say so. If not, the requirement should say the feature cannot proceed as complete without an AVP endpoint decision.

R8 is load-bearing, but it still has one escape hatch: "one AVP/manual two-round acceptance trial or a truthful blocker." A truthful blocker is not acceptance. It is a stop condition. The requirement should prevent someone from shipping the feature as complete while using "AVP unavailable" as the manual proof.

Missing requirement: watcher identity. R3 requires delivery to at least one watcher, but not the intended watcher. With multiple terminals, stale agents, or test watchers, Roughdraft could notify "a watcher" while the actual answer-writing agent is absent.

**Direct Answers**

A. Unaddressed failure mode: the handoff is delivered to the wrong or stale watcher, so Roughdraft truthfully reports watcher receipt while the intended external agent never sees the review.

B. If all R's were met, Roughdraft could still be honest but unsatisfying: it could save correctly, notify a watcher, rearm, observe only anonymous file changes/timeouts, and never produce a usable external-agent reply loop.

C. The shared unverified assumption is that watcher receipt plus Markdown version sequencing is enough to represent the collaboration loop without watcher identity or an explicit agent acknowledgement.

**What I Verified**

I read the revised R0-R8 at `/tmp/codex-shape-r-2538c51c.md:35`-`43` and the remaining ambiguity list at `/tmp/codex-shape-r-2538c51c.md:47`-`52`. I also checked the current save/version boundary: `saveMarkdownFile` returns the server response in [api-backend.ts](/Users/dalecarman/dev/roughdraft/packages/app/src/api-backend.ts:59), the server writes then returns a fresh version in [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1300), and file-watch events currently expose path/version only in [index.ts](/Users/dalecarman/dev/roughdraft/packages/server/src/index.ts:1003).

## Phase A (R Challenge) — Round 4

**Protocol Check**

No protocol violation in `/tmp/codex-shape-r-2538c51c.md`. The Round 4 context still contains requirements and ambiguity prompts only.

**Load-Bearing Challenge**

The requirements are now much closer to shape-ready. Save-before-handoff, no missed rearm, correlated file-change observation, AVP blocker handling, and causal proof are all stated as verifiable outcomes rather than specific implementation choices.

The only remaining material gap is the word "intended" in R1/R3. The requirements say watcher identity/provenance must distinguish intended, stale, and test watchers, but they do not define what makes a watcher intended without authentication. That does not require authenticated agents, but it does require a testable rule: for example, the intended watcher is the watcher registered for the active document/session/handoff context and surfaced in the trace. Without that rule, any self-labeled watcher could satisfy provenance while still being the wrong process.

CLI/MCP scope is honest enough. R4 requires CLI follow/rearm and forces MCP either to match or be explicitly labeled one-shot/out-of-scope. That prevents the single happy-path trap as long as the docs/UI-facing assumptions are part of verification.

The causal proof requirement is appropriately non-prescriptive. "Inspectable run/handoff ID or equivalent testable trace" leaves room for multiple designs while still requiring evidence across recording, save, handoff, watcher provenance, and file-change observation.

AVP unavailable is correctly treated as a completion blocker. R7 and R8 now say desktop cannot stand in for the AVP endpoint decision and unavailable AVP testing cannot count as feature completion.

One final tightening I'd ask for before drafting: R8's "two-round acceptance trial" should say whether it must include a correlated post-handoff file change/reply observation, not just two delivered handoffs. Otherwise the manual proof can validate rearm without validating the reply-observation half of the loop.

**Direct Answers**

A. Unaddressed failure mode: the intended watcher disconnects after handoff, while another stale/test watcher remains attached, causing aggregate "watcher attached" status to look healthy for the wrong recipient.

B. If all R's were met, Roughdraft could still be honest but weak: it might only show "file changed after handoff," require the user to inspect manually, and never prove that the intended answer-writing agent acted.

C. The shared unverified assumption is that unauthenticated watcher provenance is enough to stand in for intended-agent identity. That is probably acceptable, but only if "intended watcher" gets a concrete traceable definition.

**What I Verified**

I read R1-R8 in `/tmp/codex-shape-r-2538c51c.md:35`-`43` and the remaining ambiguities in `/tmp/codex-shape-r-2538c51c.md:47`-`52`. The main remaining pressure is watcher intent/provenance, not save ordering, AVP blocker semantics, or CLI/MCP scope.

## Phase B (S Challenge) — Round 1

**Protocol Check**

No protocol violation in `/tmp/codex-shape-s-2538c51c.md`: I found shapes A-D and parts tables only; no fit check, breadboard, or selected shape.

**Shape Challenge**

A and B are not as separate as they look. A says no server-side run ledger, but R1/R3/R6 require auditable causal identity, watcher provenance, and machine-readable timing evidence. Once the CLI has to report watcher provenance and the handoff has to bind to a saved version, the server almost inevitably becomes the correlation point. A likely collapses into B under real verification.

B is the cleanest state-ownership axis, but the hidden complexity is event lifecycle: pruning in-memory runs, exposing browser-origin timing without leaking content, and preserving enough evidence after reload/server restart without turning the ledger into a database. "In-memory audit evidence" is fine only if completion evidence is exported or captured before it disappears.

C is fragile. Hidden Markdown/HTML metadata gives reload recovery, but it pollutes the review file, can be deleted by users or agents, creates parser/editor preservation work, and risks making the Markdown source of truth carry machinery instead of review content. "Protects it from accidental deletion" is much harder than the table makes it sound.

D is more a future ecosystem protocol than a shape for this slice. It would finally justify "agent working," but it depends on external agents adopting callbacks. Without that adoption, D collapses back to B: watcher receipt plus correlated file-change observation.

The shapes are mostly on the right axis: where causal state lives. The missing axis is the AVP endpoint interaction. All four shapes outsource that to the prototype report, which is reasonable, but if the endpoint choice changes UI layout or timing states materially, it may need its own small shape pass after the AVP trial.

**Missing Shape**

The obvious unlisted alternative is a "server correlation spine" rather than a full server event ledger: server owns only run/handoff ID, saved version, watcher provenance, delivery, and file-change correlation; the app owns transient voice micro-states. This avoids A's client-only proof weakness without committing to B's full event API for every voice status.

**Scale Risk**

Most fragile under real conditions: C for document pollution/deletion risk, then D for external adoption risk, then A for proof/reload/multi-process drift. B has scope risk, but its failure modes are more local to Roughdraft.

**Direct Answers**

D. Most likely collapse within 3 months: A collapses into B once causal proof and watcher provenance need to survive beyond React state and aggregate watcher polling.

E. Yes: prefer an unlisted B-lite/server-correlation-spine shape if the full B ledger feels too broad. It preserves the important causality without making the server the owner of every UI micro-state.

**What I Verified**

I read the Phase B shapes in `/tmp/codex-shape-s-2538c51c.md:7`-`56` and checked the negative contract. The main collapse pressure is between A's "no server-side run ledger" at `/tmp/codex-shape-s-2538c51c.md:18` and B's server-owned run/handoff identity at `/tmp/codex-shape-s-2538c51c.md:24`-`32`.

## Phase B (S Challenge) — Round 2

**Protocol Check**

No protocol violation in `/tmp/codex-shape-s-2538c51c.md`: I found only revised shapes A-E and parts tables.

**Shape Challenge**

E is distinct from B, but only if its boundary is enforced hard. B makes the server own every voice and handoff state and renders the right rail from the server ledger. E keeps live voice micro-states in the app and sends only proof-bearing causal milestones to the server. That is a real distinction.

The danger is E3. "Posts only causal milestones needed for proof" can quietly expand until it includes every state B has. If E is meant to stay smaller, add a negative boundary: the server correlation record does not drive the live voice UI, does not attempt full timeline recovery after reload, and does not store every transient voice state.

E does not remove complexity; it localizes it. The hard parts still exist: run lifecycle, export, pruning, watcher provenance, rapid follow, own-save filtering, stale file events, and trace privacy. E is still a server feature, just a narrower one than B.

B still deserves serious consideration. If the fit check values reload recovery, one canonical timeline, or server-owned auditability more than implementation size, B may beat E. A is now mostly a prototype baseline, not a serious final shape. C and D remain high-friction: C pollutes Markdown, D depends on external agent protocol adoption.

The AVP endpoint axis can wait for the prototype report. It should not block comparing causal-state shapes now. The only caveat: whichever shape wins must leave room for the endpoint report to add selection-local Done/Cancel affordances if AVP testing demands them.

The shape set is ready to compare once E's "not B" boundary is made explicit. Without that boundary, E will look smaller on paper and then become B during implementation.

**Direct Answers**

D. Most likely collapse within 3 months of shipping: E collapses into B, as soon as evidence, reload behavior, or debugging pressure pulls more voice timeline state into the server record.

E. No strong reason to prefer a new causal-architecture shape outside A-E. The only possible extra shape would be an AVP-endpoint interaction shape, and that should wait for the prototype report rather than compete with these state/proof shapes.

**What I Verified**

I read the revised shape set in `/tmp/codex-shape-s-2538c51c.md:7`-`70`. The key comparison is B's full server ledger at `/tmp/codex-shape-s-2538c51c.md:20`-`32` versus E's server correlation spine with client voice timeline at `/tmp/codex-shape-s-2538c51c.md:57`-`69`.

## Phase C (Fit-check + Breadboard Challenge) — Round 1

**Protocol Check**

No protocol violation. The file names Shape E as the breadboarded leading shape, but explicitly says it is "not a final selection" at `/tmp/codex-shape-fitcheck-2538c51c.md:26`.

**Weakest ✅**

The weakest ✅ is E × R5. The claim depends on N6: "file-change events after handoff are compared to run saved version and own-save marker." But the breadboard does not define the own-save marker, where it lives, how long it survives, or how it distinguishes Roughdraft's save from user edits, formatter churn, agent edits, or another tool touching the file. Without that, E may not actually filter "own save, stale events, and uncorrelated document churn," so R5 could be ❌.

**Load-Bearing Assumption**

The leading shape assumes version sequencing plus a lightweight correlation record is enough to prove causality across save, handoff, watcher delivery, and later file change. That is still unverified. The current file event boundary gives path/version, not authorship or cause, so the correlation story must be proven with tests before the fit claim is safe.

**Breadboard Challenge**

The breadboard is close to concrete enough, but it is missing a key UI affordance: the actual Done Reviewing / send handoff control. U4 shows watcher state, and N4 emits `review.completed`, but no affordance says what the user clicks, when it is enabled, what it shows when blocked by missing saved version, or how it degrades when no watcher is attached.

The wires are mostly specified, but there are hand-wave gaps:

- U2 to N2: which app-owned micro-states become proof milestones, and which remain UI-only?
- N3 to N4: how does saved-version proof gate the handoff button?
- N5 to U4: how does watcher provenance distinguish intended/stale/test in UI, not just logs?
- N6 to U4/U6: what is the concrete own-save/stale-event filter?
- N8: how are durations computed across browser/server clocks without leaking raw text?

**Sliceability**

A vertical slice is possible, but the current breadboard reads partly like horizontal layers. The demo-able slice should be: select text → create run → save CriticMarkup → enable/send handoff → CLI follow receives event with provenance → simulate external file edit → UI shows "Markdown changed after handoff" with evidence. If that slice cannot be extracted, the breadboard is too broad.

**Flagged Parts**

Shape E has no flags, but E8 probably deserves one. File-change correlation and own-save filtering are the riskiest mechanism in the leading shape. Treating it as straightforward makes the E × R5 and E × R8 ✅ claims too optimistic.

**Terminology Risk**

"Own-save marker," "intended watcher," "active document/session/handoff trace," and "correlated file change" still need precise meanings. These are not naming nits; they determine whether the implementation can prove the loop or only narrate it.

**Product Manager Objection**

The first PM objection would be: "This proves a lot of plumbing, but does the user actually get the confidence they asked for?" If the final visible state is only "Markdown file changed after handoff," users may still feel like Roughdraft did not know whether the agent replied.

**What I Verified**

I read the fit matrix at `/tmp/codex-shape-fitcheck-2538c51c.md:5`-`15`, the notes at `/tmp/codex-shape-fitcheck-2538c51c.md:17`-`22`, and the Shape E breadboard at `/tmp/codex-shape-fitcheck-2538c51c.md:24`-`69`. The main unsafe fit claim is the R5 correlation claim versus the underspecified N6 mechanism at `/tmp/codex-shape-fitcheck-2538c51c.md:48`.

## Phase C (Fit-check + Breadboard Challenge) — Round 2

**Protocol Check**

No protocol violation. The file still says the breadboarded shape is "not a final selection" at `/tmp/codex-shape-fitcheck-2538c51c.md:26`.

**R5 / Own-Save Filter**

R5 is much safer now. N6 defines `saveOperationId`, `savedVersion`, `savedAt`, `handoffAt`, and the rule for ignoring own-save/stale versions. That is concrete enough for honest "Markdown file changed after handoff" detection.

Remaining caveat: this only proves a later file version, not who caused it. That is acceptable because the UI copy promises file-change observation, not agent-authored reply. The fit claim stays unsafe only if later UI copy drifts toward "agent replied."

**R8 / Verification**

R8 is still the weakest E ✅, but less because of design and more because the breadboard is not yet a verification plan. N7/N8/N9 provide evidence surfaces, but R8 requires specific risky cases: rapid second handoff, stale/test watcher provenance, stale voice discard, correlated file-change, empty transcript/OpenRouter fallback, accessibility, and AVP two-round proof.

The gap: N9 says "manual two-round proof," but does not explicitly say that proof includes the correlated post-handoff file change/reply observation required by R8. The wiring implies it at lines 67-69; N9 should say it directly.

**Done Reviewing / Send Handoff**

U7 fixes the missing affordance. It now states when the control is enabled, how save-pending blocks it, and how no-watcher degrades copy. That is concrete enough to slice.

One important caveat: U7/N4 are singular around "the current run." If a real review round can contain multiple voice feedback actions before Done Reviewing, the breadboard needs a round/handoff aggregate above individual voice runs. Otherwise the handoff may correlate only the last voice run, not the full saved review state.

**Vertical Slice**

The breadboard can now produce a demo-able vertical slice:

select text -> create run -> show voice states -> save CriticMarkup -> enable U7 -> send handoff -> CLI follow receives provenance -> simulate external Markdown edit -> correlate later file version -> show right-rail "file changed after handoff" plus evidence.

That is a real vertical slice, not just horizontal layers.

**Remaining Load-Bearing Assumptions**

The biggest remaining assumption is one voice run equals one handoff. If that is intentional for the first slice, say so. If not, add a review-round/handoff record that can contain multiple saved voice runs.

Second assumption: N5's "no rearm gap" needs a registration contract. If CLI follow is implemented as repeated POSTs, there may still be a gap. The breadboard should say the watcher remains registered across delivery, or that the next wait is established before the current event is considered fully handled.

**What I Verified**

I read the revised fit matrix at `/tmp/codex-shape-fitcheck-2538c51c.md:5`-`15` and the revised breadboard at `/tmp/codex-shape-fitcheck-2538c51c.md:28`-`70`. The key fixes are U7 at `/tmp/codex-shape-fitcheck-2538c51c.md:38`, N6 at `/tmp/codex-shape-fitcheck-2538c51c.md:49`, and the vertical wiring at `/tmp/codex-shape-fitcheck-2538c51c.md:56`-`69`.

## Phase C (Fit-check + Breadboard Challenge) — Round 3

**Protocol Check**

No protocol violation. The file still explicitly says the breadboard is not a final selection at `/tmp/codex-shape-fitcheck-2538c51c.md:26`.

**Round Aggregate**

The review-round aggregate fixes the one-run-one-handoff assumption in principle. U7 now sends a review round that may contain one or more saved voice runs, and N4 emits `review.completed` with round ID, run IDs, handoff ID, and saved version.

Remaining load-bearing gap: the review-round lifecycle is not defined. The breadboard says runs are "attached to review round," but not when a round is created, when it closes, how the next round starts after handoff, or how stale/abandoned runs are excluded. That affects implementation shape enough to settle before Phase D.

**No-Rearm Gap**

N5 is concrete enough now. "Remains registered across delivery until explicit stop/timeout/abort" plus "next event cursor is established before the current event is considered fully handled" gives a real contract for no-gap follow behavior.

**AVP / Manual Proof**

N9 now explicitly covers the missing proof: "manual two-round proof including correlated post-handoff file-change/reply observation." That closes the Round 2 gap.

**Remaining Blocker**

Only one material blocker remains: define the review-round lifecycle and make the proof export round-aware. N8 still says the trace includes "run ID," but the breadboard now depends on round ID, run IDs, handoff ID, saved version, watcher provenance, and file-change version as one chain. The trace should explicitly include the round-level chain, not only individual run evidence.

Everything else I challenged in Round 2 is now concrete enough to proceed to the next phase.

**What I Verified**

I checked the revised U7 at `/tmp/codex-shape-fitcheck-2538c51c.md:38`, N2-N5 at `/tmp/codex-shape-fitcheck-2538c51c.md:45`-`48`, N9 at `/tmp/codex-shape-fitcheck-2538c51c.md:52`, and the revised vertical wiring at `/tmp/codex-shape-fitcheck-2538c51c.md:56`-`69`.

## Phase C (Fit-check + Breadboard Challenge) — Round 4

**Protocol Check**

No protocol violation. The file still explicitly says the breadboard is not a final selection at `/tmp/codex-shape-fitcheck-2538c51c.md:26`.

**Lifecycle Check**

The review-round lifecycle is now concrete enough. U7 defines the user-facing lifecycle: send the open round, close it on send, and open the next round on the next saved-or-saving voice run. N2 defines the system lifecycle: first saved-or-saving run opens the round, stale/abandoned runs are discarded, and discarded runs are excluded from handoff.

That closes the one-run-one-handoff gap.

**Proof Export Check**

N8 is now round-aware enough. It explicitly includes round ID, run IDs, handoff ID, watcher provenance, file-change version, discarded runs, and error states. That is enough to audit a multi-run round rather than only individual voice runs.

**Remaining Blockers**

I do not see a remaining load-bearing blocker before Phase D. The only thing I'd preserve as an implementation watchpoint is the discard rule: stale/abandoned run detection must be tested carefully, because it controls whether U7 blocks forever or sends an incomplete round. But the breadboard now names that state and wires it through UI, proof, and handoff.

**What I Verified**

I checked U7 at `/tmp/codex-shape-fitcheck-2538c51c.md:38`, N2-N4 at `/tmp/codex-shape-fitcheck-2538c51c.md:45`-`47`, N8 at `/tmp/codex-shape-fitcheck-2538c51c.md:51`, and the revised vertical wiring at `/tmp/codex-shape-fitcheck-2538c51c.md:56`-`69`.

## Phase D (Selection Review) — Round 1

The selected Shape E follows from the challenged fit check. The rationale preserves the earlier conclusions: A cannot prove causality, B is heavier than needed, C pollutes Markdown, and D depends on future agent callbacks. E is correctly framed as the smallest shape that moves only proof-bearing causality to the server while keeping live voice UI client-owned.

The breadboard is concrete enough to slice. The vertical slice ends in demo-able UI: text selection through saved CriticMarkup, review-round handoff, CLI watcher provenance, simulated external Markdown edit, and right-rail "Markdown file changed after handoff" evidence.

The flagged unknowns are adequately handled as dispositions rather than unresolved shape blockers. Stale/abandoned run discard is correctly left as an implementation watchpoint with required tests; MCP scope, AVP endpoint, GJDraw reuse, and semantic agent reply detection are all bounded clearly.

VERDICT: APPROVED
