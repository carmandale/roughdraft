---
title: "Live Voice Review Loop Integration Proof"
date: 2026-05-24
bead: bd-1ny1
status: local-proof-complete
---

# Integration Proof

This artifact records the local automated verification for Group F. It supports, but does not replace, the AVP two-round manual trial in `avp-endpoint-trial.md`.

## Targeted Server Tests

Command:

```bash
pnpm --filter @roughdraft/server exec vitest run src/review-loop.test.ts src/review-events.test.ts src/index.test.ts src/cli.test.ts src/mcp.test.ts
```

Result at 2026-05-24T16:22Z: passed.

- Test files: 5 passed.
- Tests: 109 passed.

## Targeted App Tests

Command:

```bash
pnpm --filter @roughdraft/app exec vitest run src/PageCard.voice.test.ts src/DocumentWorkspace.test.tsx src/degraded-review-backends.test.ts src/api-backend.test.ts
```

Result at 2026-05-24T16:22Z: passed.

- Test files: 4 passed.
- Tests: 16 passed.

## Narrow Local Integration Probe

Command shape:

```bash
node --input-type=module <<'NODE'
# transient probe against http://localhost:7373:
# create /tmp Markdown file, register /api/review-events/follow watcher,
# create review runs, save Markdown through /api/markdown-file,
# complete review rounds, write external post-handoff file changes,
# poll /api/review-loop/status for changed file observation.
NODE
```

Result at 2026-05-24T16:21Z: passed.

Evidence:

```json
{
  "filePath": "/var/folders/2j/3tf17x5d7pj10gdjbp1ydpf40000gn/T/roughdraft-integration-live-loop-1779639715201.md",
  "serverUrl": "http://localhost:7373",
  "followLines": 2,
  "followSessionStable": true,
  "rounds": [
    {
      "round": 1,
      "runId": "992d232a-299f-4d7a-8667-44f68d1e7a30",
      "roundId": "e24d4a28-8567-409b-9137-126fa5b9e96e",
      "handoffId": "ba83a7ea-eed3-4be4-8270-079d0c9ba8f7",
      "deliveryState": "delivered",
      "followSession": "7e046d95-e87e-4848-9d6e-3f8973d88235",
      "eventHandoffId": "ba83a7ea-eed3-4be4-8270-079d0c9ba8f7",
      "observedElapsedMs": 501
    },
    {
      "round": 2,
      "runId": "774116ca-c366-478e-b553-68ac85dc6b9b",
      "roundId": "eab6f6a2-deb2-4d45-918b-8b084a16af48",
      "handoffId": "ea9a93a3-a882-4282-8b56-3c52f89d6e76",
      "deliveryState": "delivered",
      "followSession": "7e046d95-e87e-4848-9d6e-3f8973d88235",
      "eventHandoffId": "ea9a93a3-a882-4282-8b56-3c52f89d6e76",
      "observedElapsedMs": 501
    }
  ]
}
```

What this proves:

- The running dev server can register a follow watcher for the target Markdown file.
- Two review rounds can be created, saved through `/api/markdown-file`, and completed without restarting the watcher.
- The same follow watcher session receives both `review.completed` handoffs.
- Later Markdown file changes after each handoff are observed as changed file versions, not claimed agent replies.

What this does not prove:

- Apple Vision Pro microphone permission or selection/release ergonomics.
- Human-visible discoverability of release/clear-selection as the stop action.
- End-to-end browser microphone capture on AVP.

## Repo Check

Command:

```bash
pnpm check
```

Final result at 2026-05-24T16:27Z: passed.

- `biome check . --assist-enabled=false`: 116 files checked, no fixes applied.
- `node scripts/check-test-selectors.mjs`: passed.
- `@roughdraft/rfm` tests: 1 file passed, 14 tests passed.
- `@roughdraft/app` tests: 19 files passed, 215 tests passed.
- `@roughdraft/server` tests: 8 files passed, 128 tests passed.
- `@roughdraft/rfm`, `@roughdraft/app`, and `@roughdraft/server` builds: passed.

Note: the first `pnpm check` attempt failed because Biome was scanning generated GoalBuddy/Codex workflow artifacts and pre-existing unformatted implementation files. The repo-owned fix excludes generated workflow runtime artifacts from Biome and ignores local command runtime state in `.gitignore`; implementation files were formatted/type-tightened instead of weakening product lint.

## Remaining Blocker

`T25` remains open. AVP/manual two-round endpoint acceptance is still required before implementation can be called complete and before `implement-receipt.md` can truthfully claim full completion.
