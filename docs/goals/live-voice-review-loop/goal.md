# Live Voice Review Loop

## Objective

Follow the Dale workflow for `specs/001-live-voice-review-loop/`: complete the issue-backed shaping, planning, review, implementation, verification, and finalize sequence until Roughdraft's live voice review loop is actually delivered or truthfully blocked.

## Original Request

Use GoalBuddy with `$issue` to produce the Live Voice Review Loop spec and continue through Dale's workflow, including shaping that can challenge the grill-me first pass.

## Intake Summary

- Input shape: `existing_plan`
- Source spec path: `specs/001-live-voice-review-loop/spec.md`
- Source bead: `bd-1ny1`
- Execution lane: `dale_workflow`
- Execution lane reason: defaulted to Dale workflow; no explicit direct-goal opt-out phrase matched
- Audience: Dale using Roughdraft on Apple Vision Pro, plus external coding agents using Roughdraft watcher handoffs
- Authority: `approved`
- Proof type: `local_test`, `manual`
- Prior failure signal: `true`
- Completion proof: PR branch contains a verified implementation; automated gates pass; AVP two-round manual trial proves the user can tell Roughdraft heard them, see timing, and receive a second-round agent response without manually reattaching the watcher.
- Likely misfire: producing green specs/plans or a polished animation while the voice loop still lies about agent state, lacks timestamps, or drops the watcher after one handoff.
- Blind spots considered: false "agent working" copy, one-shot watcher, AVP selection endpoint uncertainty, animation distraction, external-agent boundary.
- Existing plan facts: the `$grill-me` pass and issue spec selected a right-rail status/timeline, continuous watch auto-rearm, timestamped activity, external-agent boundary, AVP endpoint prototype, and fast GJDraw-animation attempt with fallback.
- Purpose source sections: `Source (verbatim)`, `Problem`, `Requirements`, `Acceptance Criteria`, `Constraint`, `Out of Scope`

## Purpose Contract

- Confirmation: `user_confirmed`
- Tangible outcome: Roughdraft's live voice review loop is visibly trustworthy from speech capture through external-agent reply.
- Done proof:
  - `$issue`, `$codex-shape`, `$codex-plan`, `$codex-review`, `$codex-implement`, `$code-verify`, and `$finalize` are completed or truthfully blocked with receipts.
  - Automated verification required by the final plan passes.
  - AVP/manual two-round review proves watcher auto-rearm and truthful status/timeline behavior.
- False positives:
  - The spec exists but shaping did not challenge it.
  - The UI looks cooler but still uses false "agent working" copy.
  - One voice comment works but the second handoff has no watcher.
  - Tests pass without a real/manual AVP workflow check.
- Required outcome checks:
  - OC1: Shaping challenges the issue spec and either confirms or revises the selected shape.
  - OC2: Planning records implementation slices, risks, and verification, including AVP/manual proof.
  - OC3: Implementation changes the app/CLI/server behavior, not just docs.
  - OC4: Verification proves no false agent-working state and at least two handoff events through continuous watch.
  - OC5: Finalize closes the bead only after the full user outcome is met or truthfully blocked.

## Goal Kind

`existing_plan`

## Current Tranche

Continue from the already-created issue/spec into workflow-correct shaping. Use the existing grill/spec as seed material, but allow `$codex-shape` to challenge, revise, or split the shape before planning.

## Non-Negotiable Constraints

- GoalBuddy is the orchestrator; do not bypass the board and call partial workflow progress complete.
- `$issue` is complete, not the whole goal.
- `$codex-shape` is required next because this is product/interaction shaping, not a trivial bug fix.
- Keep the agent response external in this lane.
- Continuous watcher auto-rearm is a must-have.
- Timestamped status/timeline is a must-have.
- AVP manual testing is part of acceptance.

## Stop Rule

Stop only when a final audit proves the full original outcome is complete, or when a real blocker is recorded with a resume condition.

## Canonical Board

Machine truth lives at:

`docs/goals/live-voice-review-loop/state.yaml`

If this charter and `state.yaml` disagree, `state.yaml` wins for task status, active task, receipts, verification freshness, and completion truth.

## Run Command

```text
/goal Follow docs/goals/live-voice-review-loop/goal.md.
```

