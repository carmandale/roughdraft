import { describe, expect, it, vi } from "vitest";
import { completeSavedReviewRound, shouldWarnBeforeUnload } from "../src/App";
import type { ReviewLoopStatus, StorageBackend } from "../src/storage";

describe("beforeunload save warning", () => {
  it.each([
    [{ isDirty: true, saveState: "saved", diskChangeState: "clean" }, true],
    [{ isDirty: false, saveState: "saving", diskChangeState: "clean" }, true],
    [{ isDirty: false, saveState: "unsaved", diskChangeState: "clean" }, true],
    [{ isDirty: false, saveState: "error", diskChangeState: "clean" }, true],
    [{ isDirty: false, saveState: "saved", diskChangeState: "conflict" }, true],
    [{ isDirty: false, saveState: "saved", diskChangeState: "clean" }, false],
  ] as const)("returns %s for %o", (input, expected) => {
    expect(
      shouldWarnBeforeUnload({
        activeDocumentPath: "doc.md",
        ...input,
      }),
    ).toBe(expected);
  });

  it("does not warn when no document is open", () => {
    expect(
      shouldWarnBeforeUnload({
        activeDocumentPath: null,
        isDirty: true,
        saveState: "error",
        diskChangeState: "conflict",
      }),
    ).toBe(false);
  });
});

describe("completeSavedReviewRound", () => {
  it("completes the saved round without issuing another markdown save", async () => {
    const backend = createReviewBackend({
      openRound: {
        roundId: "round-1",
        documentPath: "/tmp/project/draft.md",
        projectPath: "/tmp/project",
        relativePath: "draft.md",
        runIds: ["run-1"],
        savedVersion: "v2",
        status: "open",
        createdAt: "2026-05-24T12:00:00.000Z",
        updatedAt: "2026-05-24T12:00:00.000Z",
      },
    });

    await expect(
      completeSavedReviewRound(backend, "draft.md", { savedVersion: "v2" }),
    ).resolves.toEqual({ delivered: true });

    expect(backend.saveMarkdownFile).not.toHaveBeenCalled();
    expect(backend.completeReview).toHaveBeenCalledWith("draft.md", {
      roundId: "round-1",
    });
  });

  it("refuses handoff when the flushed saved version does not match the open round", async () => {
    const backend = createReviewBackend({
      openRound: {
        roundId: "round-1",
        documentPath: "/tmp/project/draft.md",
        projectPath: "/tmp/project",
        relativePath: "draft.md",
        runIds: ["run-1"],
        savedVersion: "v2",
        status: "open",
        createdAt: "2026-05-24T12:00:00.000Z",
        updatedAt: "2026-05-24T12:00:00.000Z",
      },
    });

    await expect(
      completeSavedReviewRound(backend, "draft.md", { savedVersion: "v3" }),
    ).resolves.toEqual({
      delivered: false,
      reason: "missing_review_round",
    });

    expect(backend.completeReview).not.toHaveBeenCalled();
    expect(backend.saveMarkdownFile).not.toHaveBeenCalled();
  });

  it("reports unsupported when the backend has no live review-loop status", async () => {
    const backend = createReviewBackend();
    delete backend.getReviewLoopStatus;

    await expect(
      completeSavedReviewRound(backend, "draft.md", { savedVersion: "v2" }),
    ).resolves.toEqual({
      delivered: false,
      reason: "not_supported",
    });

    expect(backend.completeReview).not.toHaveBeenCalled();
    expect(backend.saveMarkdownFile).not.toHaveBeenCalled();
  });
});

function createReviewBackend(
  status: Partial<ReviewLoopStatus> = {},
): StorageBackend & {
  completeReview: ReturnType<typeof vi.fn>;
  saveMarkdownFile: ReturnType<typeof vi.fn>;
} {
  return {
    info: {
      kind: "local-files",
      label: "Local",
      detail: "Project",
      projectPath: "/tmp/project",
    },
    canManageProjects: true,
    getMarkdownFile: vi.fn(),
    saveMarkdownFile: vi.fn(),
    getReviewLoopStatus: vi.fn(async () => ({
      documentPath: "/tmp/project/draft.md",
      projectPath: "/tmp/project",
      relativePath: "draft.md",
      openRound: null,
      activeRuns: [],
      recentHandoffs: [],
      ...status,
    })),
    completeReview: vi.fn(async () => ({ delivered: true })),
    saveAsset: vi.fn(),
    resolveFileUrl: vi.fn(() => null),
    openProject: vi.fn(),
  };
}
