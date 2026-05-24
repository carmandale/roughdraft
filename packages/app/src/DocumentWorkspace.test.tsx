import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DocumentWorkspace,
  getReviewEvidenceViewModel,
  getReviewHandoffViewModel,
} from "./DocumentWorkspace";
import type { Page, ReviewLoopStatus, StorageBackend } from "./storage";

const pageCardHarness = vi.hoisted(() => ({
  flushSave: vi.fn(async () => ({
    status: "saved" as const,
    savedVersion: "v2",
  })),
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
        props.onSaveControllerChange?.({
          flushSave: pageCardHarness.flushSave,
        });
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

  it("maps file-change observation states to honest evidence copy and elapsed time", () => {
    const cases = [
      {
        state: "waiting" as const,
        title: "Waiting for file change",
        elapsed: "5.0s",
      },
      {
        state: "changed" as const,
        title: "Markdown file changed after handoff",
        elapsed: "2.5s",
      },
      {
        state: "timeout" as const,
        title: "No file change observed",
        elapsed: "30s",
      },
      {
        state: "disconnected" as const,
        title: "File-change watch disconnected",
        elapsed: "3.0s",
      },
      {
        state: "failed" as const,
        title: "File-change observation failed",
        elapsed: "4.0s",
      },
    ];

    for (const testCase of cases) {
      const view = getReviewEvidenceViewModel(
        reviewLoopStatusFor(testCase.state),
        Date.parse("2026-05-24T13:00:05.000Z"),
      );
      expect(view?.title).toBe(testCase.title);
      expect(view?.entries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: "Run", value: "run-1111" }),
          expect.objectContaining({ label: "Round", value: "round-111" }),
          expect.objectContaining({ label: "Handoff", value: "handoff-" }),
          expect.objectContaining({ label: "Saved", value: "version-v2" }),
          expect.objectContaining({
            label: "Watcher",
            value: "cli-follow watcher-",
          }),
          expect.objectContaining({
            label: "Elapsed",
            value: testCase.elapsed,
          }),
        ]),
      );
      expect(JSON.stringify(view)).not.toContain("agent replied");
      expect(JSON.stringify(view)).not.toContain("agent is working");
    }
  });

  it("shows explicit unsupported feedback when the backend cannot deliver live handoff", async () => {
    const backend = createBackend({
      getReviewWatchStatus: async () => ({
        watching: true,
        watcherCount: 1,
        watchers: [],
      }),
    });

    await renderWorkspace({
      backend,
      onCompleteReview: vi.fn(async () => ({
        delivered: false,
        reason: "not_supported" as const,
      })),
    });
    await tick();

    const button = container?.querySelector<HTMLButtonElement>(
      "[data-testid='review-handoff-button']",
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container?.textContent).toContain("Live review unsupported");
  });

  it("renders compact review-loop evidence without motion classes", async () => {
    const backend = createBackend({
      getReviewWatchStatus: async () => ({
        watching: true,
        watcherCount: 1,
        watchers: [],
      }),
      getReviewLoopStatus: async () => reviewLoopStatusFor("waiting"),
    });

    await renderWorkspace({
      backend,
      onCompleteReview: vi.fn(async () => ({ delivered: false })),
    });
    await tick();

    const evidence = container?.querySelector<HTMLElement>(
      "[data-testid='review-loop-evidence']",
    );
    expect(evidence).toBeTruthy();
    expect(evidence?.textContent).toContain("Waiting for file change");
    expect(evidence?.textContent).toContain("version-v2");
    expect(evidence?.outerHTML).not.toContain("animate-");
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

function reviewLoopStatusFor(
  state: "waiting" | "changed" | "timeout" | "disconnected" | "failed",
): ReviewLoopStatus {
  const startedAt = "2026-05-24T13:00:00.000Z";
  return {
    documentPath: "/tmp/project/draft.md",
    projectPath: "/tmp/project",
    relativePath: "draft.md",
    openRound: null,
    activeRuns: [],
    recentHandoffs: [
      {
        handoffId: "handoff-111111111",
        roundId: "round-111",
        documentPath: "/tmp/project/draft.md",
        projectPath: "/tmp/project",
        relativePath: "draft.md",
        runIds: ["run-1111"],
        savedVersion: "version-v2",
        handoffAt: startedAt,
        delivery: {
          state: "delivered",
          watchers: [
            {
              sessionId: "watcher-111111",
              source: "cli-follow",
              documentPath: "/tmp/project/draft.md",
              startedAt: "2026-05-24T12:59:59.000Z",
              lastDeliveredAt: "2026-05-24T13:00:00.000Z",
              state: "delivered",
            },
          ],
        },
        fileChangeObservation: {
          state,
          baselineVersion: "version-v2",
          startedAt,
          ...(state === "changed"
            ? {
                observedVersion: "version-v3",
                observedAt: "2026-05-24T13:00:02.500Z",
                endedAt: "2026-05-24T13:00:02.500Z",
                elapsedMs: 2500,
              }
            : {}),
          ...(state === "timeout"
            ? {
                endedAt: "2026-05-24T13:00:30.000Z",
                elapsedMs: 30_000,
              }
            : {}),
          ...(state === "disconnected"
            ? {
                endedAt: "2026-05-24T13:00:03.000Z",
                elapsedMs: 3000,
              }
            : {}),
          ...(state === "failed"
            ? {
                endedAt: "2026-05-24T13:00:04.000Z",
                elapsedMs: 4000,
                errorClass: "EACCES",
              }
            : {}),
        },
      },
    ],
  };
}

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
