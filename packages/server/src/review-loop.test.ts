import { describe, expect, it } from "vitest";
import { ReviewLoopProofHelper } from "./review-loop";

describe("ReviewLoopProofHelper", () => {
  it("review-loop records a redacted review-run lifecycle without raw selected text", () => {
    let now = Date.parse("2026-05-24T13:00:00.000Z");
    let id = 0;
    const helper = new ReviewLoopProofHelper({
      now: () => now,
      idFactory: () => `id-${++id}`,
    });

    const run = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v1",
      selection: {
        from: 10,
        to: 23,
        selectedText: "raw selected secret",
      },
    });
    now += 100;
    helper.recordMilestone(run.runId, "transcript_received", {
      durationMs: 100,
    });
    now += 100;
    const saved = helper.markSavedVersion(run.runId, "v2");

    expect(saved.run).toMatchObject({
      runId: "id-1",
      roundId: "id-2",
      selectionLength: "raw selected secret".length,
      selectionRange: { from: 10, to: 23 },
      preActionVersion: "v1",
      savedVersion: "v2",
      status: "saved",
    });
    expect(saved.run.selectionHash).toHaveLength(64);

    const proofJson = JSON.stringify(
      helper.statusForDocument("/tmp/project/draft.md"),
    );
    expect(proofJson).not.toContain("raw selected secret");
    expect(proofJson).not.toContain("transcript text");
  });

  it("review-loop refuses to complete an unsaved review round", () => {
    let id = 0;
    const helper = new ReviewLoopProofHelper({
      idFactory: () => `id-${++id}`,
    });
    const run = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v1",
      selection: {
        selectedText: "selected text",
      },
    });
    const saved = helper.markSavedVersion(run.runId, "v2");
    const secondRun = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v2",
      selection: {
        selectedText: "another selection",
      },
    });
    helper.recordMilestone(secondRun.runId, "save_started");

    expect(() =>
      helper.completeRound("/tmp/project/draft.md", saved.round.roundId),
    ).toThrow(
      "review round has unsaved runs",
    );
  });

  it("review-loop lets discarded saving runs stop blocking a saved round", () => {
    let id = 0;
    const helper = new ReviewLoopProofHelper({
      idFactory: () => `id-${++id}`,
    });
    const savedRun = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v1",
      selection: {
        selectedText: "selected text",
      },
    });
    const saved = helper.markSavedVersion(savedRun.runId, "v2");
    const discardedRun = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v2",
      selection: {
        selectedText: "discard me",
      },
    });
    helper.recordMilestone(discardedRun.runId, "save_started");
    helper.recordMilestone(discardedRun.runId, "discarded");

    const handoff = helper.completeRound(
      "/tmp/project/draft.md",
      saved.round.roundId,
    );

    expect(handoff.runIds).toEqual([savedRun.runId]);
    expect(helper.statusForDocument("/tmp/project/draft.md").openRound).toBeNull();
  });

  it("review-loop prunes expired saving runs out of the open round", () => {
    let now = Date.parse("2026-05-24T13:00:00.000Z");
    let id = 0;
    const helper = new ReviewLoopProofHelper({
      ttlMs: 100,
      now: () => now,
      idFactory: () => `id-${++id}`,
    });
    const staleRun = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v1",
      selection: {
        selectedText: "stale saving text",
      },
    });
    helper.recordMilestone(staleRun.runId, "save_started");

    now += 101;
    const savedRun = helper.createRun({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      preActionVersion: "v2",
      selection: {
        selectedText: "fresh saved text",
      },
    });
    const saved = helper.markSavedVersion(savedRun.runId, "v3");

    const status = helper.statusForDocument("/tmp/project/draft.md");
    expect(status.activeRuns.map((run) => run.runId)).toEqual([savedRun.runId]);
    expect(status.openRound?.runIds).toEqual([savedRun.runId]);
    expect(() =>
      helper.completeRound("/tmp/project/draft.md", saved.round.roundId),
    ).not.toThrow();
  });
});
