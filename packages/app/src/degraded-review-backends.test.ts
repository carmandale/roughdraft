import { describe, expect, it } from "vitest";
import { LocalStorageBackend } from "./local-storage-backend";
import { PreviewBackend } from "./preview-backend";
import { RemoteBackend } from "./remote-backend";
import type { Page, StorageBackend } from "./storage";

describe("degraded review handoff backends", () => {
  it("reports not_supported for browser storage without proof-bearing claims", async () => {
    const backend = new LocalStorageBackend();
    await expect(backend.completeReview("draft.md")).resolves.toEqual({
      delivered: false,
      reason: "not_supported",
    });
    expect(backend.getReviewLoopStatus).toBeUndefined();
    expect(backend.getReviewWatchStatus).toBeUndefined();
  });

  it("reports not_supported for live preview without proof-bearing claims", async () => {
    const backend = new PreviewBackend(PREVIEW_PAGE);
    await expect(backend.completeReview("preview.md")).resolves.toEqual({
      delivered: false,
      reason: "not_supported",
    });
    expect(backend.getReviewLoopStatus).toBeUndefined();
    expect(backend.getReviewWatchStatus).toBeUndefined();
  });

  it("leaves remote sessions out of live-loop support until a proof API exists", () => {
    const backend: StorageBackend = new RemoteBackend(
      {
        kind: "remote",
        label: "Remote document",
        detail: "draft.md",
        sessionId: "session-1",
        originPath: "/work/draft.md",
      },
      {
        id: "session-1",
        originPath: "/work/draft.md",
        content: "# Draft\n",
        version: "remote-v1",
      },
    );

    expect(backend.completeReview).toBeUndefined();
    expect(backend.getReviewLoopStatus).toBeUndefined();
    expect(backend.getReviewWatchStatus).toBeUndefined();
  });
});

const PREVIEW_PAGE: Page = {
  id: "preview",
  title: "Preview",
  content: "# Preview\n",
};
