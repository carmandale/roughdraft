import { describe, expect, it } from "vitest";
import { LocalStorageBackend } from "./local-storage-backend";
import { PreviewBackend } from "./preview-backend";
import type { Page } from "./storage";

describe("degraded review handoff backends", () => {
  it("reports not_supported for browser storage", async () => {
    await expect(
      new LocalStorageBackend().completeReview("draft.md"),
    ).resolves.toEqual({
      delivered: false,
      reason: "not_supported",
    });
  });

  it("reports not_supported for live preview", async () => {
    await expect(
      new PreviewBackend(PREVIEW_PAGE).completeReview("preview.md"),
    ).resolves.toEqual({
      delivered: false,
      reason: "not_supported",
    });
  });
});

const PREVIEW_PAGE: Page = {
  id: "preview",
  title: "Preview",
  content: "# Preview\n",
};
