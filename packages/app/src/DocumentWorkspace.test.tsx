import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DocumentWorkspace,
  getReviewHandoffViewModel,
} from "./DocumentWorkspace";
import type { Page, StorageBackend } from "./storage";

const pageCardHarness = vi.hoisted(() => ({
  flushSave: vi.fn(async () => ({ status: "saved" as const, savedVersion: "v2" })),
  saveState: "saved",
}));

vi.mock("./PageCard", async () => {
  const React = await import("react");
  return {
    PageCard: (props: {
      onSaveControllerChange?: (controller: {
        flushSave: typeof pageCardHarness.flushSave;
      }) => void;
      onSaveStateChange?: (state: string) => void;
    }) => {
      React.useEffect(() => {
        props.onSaveControllerChange?.({ flushSave: pageCardHarness.flushSave });
        props.onSaveStateChange?.(pageCardHarness.saveState);
        return () => props.onSaveControllerChange?.(null as never);
      }, [props]);
      return <div data-testid="mock-page-card" />;
    },
  };
});

describe("DocumentWorkspace review handoff", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    root = null;
    container?.remove();
    container = null;
    pageCardHarness.flushSave.mockClear();
    pageCardHarness.flushSave.mockResolvedValue({
      status: "saved",
      savedVersion: "v2",
    });
    pageCardHarness.saveState = "saved";
    vi.restoreAllMocks();
  });

  it("flushes unsaved editor content before completing the review handoff", async () => {
    const events: string[] = [];
    pageCardHarness.saveState = "unsaved";
    pageCardHarness.flushSave.mockImplementation(async () => {
      events.push("flush");
      return { status: "saved", savedVersion: "v2" };
    });
    const backend = createBackend({
      getReviewWatchStatus: async () => ({
        watching: true,
        watcherCount: 1,
        watchers: [],
      }),
    });
    const onCompleteReview = vi.fn(async () => {
      events.push("complete");
      return { delivered: true };
    });

    await renderWorkspace({
      backend,
      onCompleteReview,
    });
    await tick();

    const button = container?.querySelector<HTMLButtonElement>(
      "[data-testid='review-handoff-button']",
    );
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(events).toEqual(["flush", "complete"]);
    expect(onCompleteReview).toHaveBeenCalledWith({ savedVersion: "v2" });
  });

  it("uses watcher and save-proof copy without claiming the agent is working", () => {
    const delivered = getReviewHandoffViewModel({
      state: "notified",
      watcherCount: 1,
    });
    const blocked = getReviewHandoffViewModel({
      state: "save_blocked",
      watcherCount: 1,
    });
    const unsupported = getReviewHandoffViewModel({
      state: "unsupported",
      watcherCount: 0,
    });

    expect(delivered.title).toBe("Handoff delivered");
    expect(blocked.inlineLabel).toBe("Save proof missing");
    expect(unsupported.title).toBe("Live review unsupported");
    expect(JSON.stringify([delivered, blocked, unsupported])).not.toContain(
      "agent is now working",
    );
  });

  async function renderWorkspace({
    backend,
    onCompleteReview,
  }: {
    backend: StorageBackend;
    onCompleteReview: (request?: {
      savedVersion?: string;
    }) => Promise<{ delivered: boolean }>;
  }) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <DocumentWorkspace
          documentPage={TEST_PAGE}
          activeDocumentPath="draft.md"
          documentFilenameLabel="draft.md"
          documentEditorViewMode="rich-text"
          onDocumentEditorViewModeChange={() => {}}
          onSaveDocument={async () => TEST_PAGE}
          onDocumentSaveStateChange={() => {}}
          onDocumentDirtyStateChange={() => {}}
          onDocumentLocalContentChange={() => {}}
          documentDiskChangeState="clean"
          documentForceResetKey={null}
          onReloadDocumentFromDisk={() => {}}
          onKeepEditingWithoutAutosave={() => {}}
          onOverwriteDocumentOnDisk={() => {}}
          onCompleteReview={onCompleteReview}
          backend={backend}
        />,
      );
    });
  }
});

const TEST_PAGE: Page = {
  id: "draft",
  title: "Draft",
  content: "# Draft\n",
  version: "v1",
};

function createBackend(
  overrides: Partial<StorageBackend> = {},
): StorageBackend {
  return {
    info: { kind: "local-files", label: "Local", detail: "Project" },
    canManageProjects: true,
    getMarkdownFile: async () => TEST_PAGE,
    saveMarkdownFile: async () => ({ ...TEST_PAGE, version: "v2" }),
    saveAsset: async () => ({
      markdownPath: "./asset.png",
      previewUrl: "/asset.png",
      mimeType: "image/png",
    }),
    resolveFileUrl: () => null,
    openProject: async () => {},
    ...overrides,
  };
}

async function tick() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}
