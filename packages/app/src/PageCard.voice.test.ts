import type { Editor } from "@tiptap/react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DocumentSaveController,
  nextVoiceProgressState,
  PageCard,
  VOICE_REVIEW_TIMELINE_STAGES,
} from "./PageCard";
import type { Page, ReviewRunProof, StorageBackend } from "./storage";

function createDomRect(width = 120, height = 24): DOMRect {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON() {
      return this;
    },
  } as DOMRect;
}

function createReviewRunProof(overrides: Partial<ReviewRunProof> = {}) {
  const now = new Date("2026-05-24T12:00:00.000Z").toISOString();
  return {
    runId: "run-1",
    roundId: "round-1",
    documentPath: "/tmp/project/draft.md",
    projectPath: "/tmp/project",
    relativePath: "draft.md",
    selectionHash: "selection-hash",
    selectionLength: 6,
    selectionRange: { from: 1, to: 7 },
    preActionVersion: "v1",
    savedVersion: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
    milestones: [],
    pruneAt: now,
    ...overrides,
  } satisfies ReviewRunProof;
}

function createBackend(overrides: Partial<StorageBackend> = {}): StorageBackend {
  return {
    info: {
      kind: "local-files",
      label: "Local",
      detail: "Project",
      projectPath: "/tmp/project",
    },
    canManageProjects: true,
    async getMarkdownFile(relativePath) {
      return { id: relativePath, title: relativePath, content: "" };
    },
    async saveMarkdownFile() {
      return undefined;
    },
    async saveAsset(file) {
      return {
        markdownPath: file.name,
        previewUrl: `file://${file.name}`,
        mimeType: file.type || "application/octet-stream",
      };
    },
    resolveFileUrl(path) {
      return `file://${path}`;
    },
    async openProject() {},
    ...overrides,
  };
}

function findTextRange(editor: Editor, text: string) {
  let range: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const offset = node.text.indexOf(text);
    if (offset < 0) return;
    range = { from: pos + offset, to: pos + offset + text.length };
    return false;
  });
  return range;
}

async function selectText(editor: Editor, text: string) {
  const range = findTextRange(editor, text);
  expect(range).not.toBeNull();
  if (!range) throw new Error(`Could not find text range for "${text}"`);
  await act(async () => {
    editor.commands.focus();
    editor.commands.setTextSelection(range);
  });
  await flushReact();
}

async function clearSelection(editor: Editor) {
  const { to } = editor.state.selection;
  await act(async () => {
    editor.commands.setTextSelection({ from: to, to });
  });
  await flushReact();
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function waitUntil(assertion: () => void, attempts = 30) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      });
    }
  }
  throw lastError;
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];

  state: RecordingState = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_stream: MediaStream) {
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  requestData() {
    this.ondataavailable?.({
      data: new Blob(["voice"], { type: "audio/webm" }),
    } as BlobEvent);
  }

  stop() {
    this.state = "inactive";
    this.onstop?.(new Event("stop"));
  }
}

describe("PageCard voice review proof", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let originalMediaRecorder: typeof MediaRecorder | undefined;
  let originalMediaDevices: MediaDevices | undefined;

  beforeEach(() => {
    vi.useRealTimers();
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    originalMediaRecorder = globalThis.MediaRecorder;
    originalMediaDevices = navigator.mediaDevices;
    FakeMediaRecorder.instances = [];

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        return createDomRect(
          this.classList.contains("ProseMirror") ? 640 : 120,
          this.classList.contains("ProseMirror") ? 240 : 24,
        );
      },
    );
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => createDomRect(80, 20),
    });
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [createDomRect(80, 20)],
    });
    Object.defineProperty(HTMLElement.prototype, "getClientRects", {
      configurable: true,
      value() {
        return [this.getBoundingClientRect()];
      },
    });
    Object.defineProperty(Text.prototype, "getClientRects", {
      configurable: true,
      value: () => [createDomRect(80, 20)],
    });
    window.scrollBy = vi.fn();
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder as unknown as typeof MediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    root = null;
    container?.remove();
    container = null;
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices,
    });
    vi.restoreAllMocks();
  });

  it("covers the select-to-record loop states needed for saved proof", () => {
    expect([...VOICE_REVIEW_TIMELINE_STAGES]).toEqual([
      "listening",
      "stopping",
      "transcribing",
      "transcript_received",
      "classifying",
      "applying",
      "saving",
      "saved",
      "failed",
      "stale",
      "discarded",
    ]);
  });

  it("keeps stale progress from overwriting a newer voice run", () => {
    const current = {
      runId: 2,
      stage: "listening" as const,
      message: "Listening...",
    };
    const older = {
      runId: 1,
      stage: "transcribing" as const,
      message: "Transcribing audio...",
    };

    expect(nextVoiceProgressState(current, older, 2)).toBe(current);
    expect(nextVoiceProgressState(null, older, 2)).toMatchObject({
      runId: 1,
      stage: "stale",
      message: "Skipped stale voice run.",
    });
  });

  it("discards too-short selection releases without transcribing or saving", async () => {
    let nowMs = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const createReviewRun = vi.fn(async () => createReviewRunProof());
    const recordReviewRunMilestone = vi.fn(async (runId: string) =>
      createReviewRunProof({ runId }),
    );
    const processVoiceUtterance = vi.fn(async () => ({
      action: "comment" as const,
      content: "Make this clearer",
      confidence: 0.95,
    }));
    const backend = createBackend({
      createReviewRun,
      recordReviewRunMilestone,
      processVoiceUtterance,
    });
    const rendered = await renderPageCard({ backend });

    await selectText(rendered.getEditor(), "target");
    await waitUntil(() => expect(createReviewRun).toHaveBeenCalledTimes(1));
    nowMs = 1_200;
    await clearSelection(rendered.getEditor());

    await waitUntil(() =>
      expect(recordReviewRunMilestone.mock.calls).toContainEqual([
        "run-1",
        "discarded",
        undefined,
      ]),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(processVoiceUtterance).not.toHaveBeenCalled();
    expect(rendered.onSave).not.toHaveBeenCalled();
  });

  it("records, transcribes, applies, saves, and binds saved version proof on selection release", async () => {
    let nowMs = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/voice/session/start") {
        return jsonResponse({ sessionId: "voice-session-1" });
      }
      if (url === "/api/voice/session/chunk") {
        return jsonResponse({ ok: true });
      }
      if (url === "/api/voice/session/stop") {
        return jsonResponse({ transcript: "Make this clearer" });
      }
      return new Response("not found", { status: 404 });
    });

    const createReviewRun = vi.fn(async () => createReviewRunProof());
    const recordReviewRunMilestone = vi.fn(async (runId: string) =>
      createReviewRunProof({ runId }),
    );
    const markReviewRunSavedVersion = vi.fn(
      async (runId: string, relativePath: string, savedVersion: string) => ({
        run: createReviewRunProof({
          runId,
          relativePath,
          savedVersion,
          status: "saved",
        }),
        round: {
          roundId: "round-1",
          documentPath: "/tmp/project/draft.md",
          projectPath: "/tmp/project",
          relativePath,
          runIds: [runId],
          savedVersion,
          status: "open" as const,
          createdAt: new Date("2026-05-24T12:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-05-24T12:00:00.000Z").toISOString(),
        },
      }),
    );
    const processVoiceUtterance = vi.fn(async () => ({
      action: "comment" as const,
      content: "Make this clearer",
      confidence: 0.95,
    }));
    const backend = createBackend({
      createReviewRun,
      recordReviewRunMilestone,
      markReviewRunSavedVersion,
      processVoiceUtterance,
    });
    const rendered = await renderPageCard({ backend });

    rendered.onSave.mockResolvedValue({
      ...TEST_PAGE,
      content: "saved markdown",
      version: "v2",
    });

    await selectText(rendered.getEditor(), "target");
    await waitUntil(() => expect(createReviewRun).toHaveBeenCalledTimes(1));
    nowMs = 1_700;
    await clearSelection(rendered.getEditor());

    await waitUntil(() =>
      expect(markReviewRunSavedVersion).toHaveBeenCalledWith(
        "run-1",
        "draft.md",
        "v2",
      ),
    );

    expect(createReviewRun).toHaveBeenCalledWith(
      "draft.md",
      expect.objectContaining({ selectedText: "target" }),
    );
    expect(processVoiceUtterance).toHaveBeenCalledWith(
      "draft.md",
      "Make this clearer",
      expect.objectContaining({ selectedText: "target" }),
    );
    expect(rendered.onSave).toHaveBeenCalledTimes(1);
    expect(recordReviewRunMilestone.mock.calls.map((call) => call[1])).toEqual(
      expect.arrayContaining([
        "recording_started",
        "stopping",
        "transcribing",
        "transcript_received",
        "classification_requested",
        "classification_completed",
        "edit_applied",
        "save_started",
      ]),
    );
  });

  it("fails the voice proof when save succeeds without a saved file version", async () => {
    let nowMs = 1_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/voice/session/start") {
        return jsonResponse({ sessionId: "voice-session-1" });
      }
      if (url === "/api/voice/session/chunk") {
        return jsonResponse({ ok: true });
      }
      if (url === "/api/voice/session/stop") {
        return jsonResponse({ transcript: "Make this clearer" });
      }
      return new Response("not found", { status: 404 });
    });

    const createReviewRun = vi.fn(async () => createReviewRunProof());
    const recordReviewRunMilestone = vi.fn(async (runId: string) =>
      createReviewRunProof({ runId }),
    );
    const markReviewRunSavedVersion = vi.fn(
      async (runId: string, relativePath: string, savedVersion: string) => ({
        run: createReviewRunProof({
          runId,
          relativePath,
          savedVersion,
          status: "saved",
        }),
        round: {
          roundId: "round-1",
          documentPath: "/tmp/project/draft.md",
          projectPath: "/tmp/project",
          relativePath,
          runIds: [runId],
          savedVersion,
          status: "open" as const,
          createdAt: new Date("2026-05-24T12:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-05-24T12:00:00.000Z").toISOString(),
        },
      }),
    );
    const processVoiceUtterance = vi.fn(async () => ({
      action: "comment" as const,
      content: "Make this clearer",
      confidence: 0.95,
    }));
    const backend = createBackend({
      createReviewRun,
      recordReviewRunMilestone,
      markReviewRunSavedVersion,
      processVoiceUtterance,
    });
    const rendered = await renderPageCard({ backend });

    rendered.onSave.mockResolvedValue({
      id: TEST_PAGE.id,
      title: TEST_PAGE.title,
      content: "saved markdown",
    });

    await selectText(rendered.getEditor(), "target");
    await waitUntil(() => expect(createReviewRun).toHaveBeenCalledTimes(1));
    nowMs = 1_700;
    await clearSelection(rendered.getEditor());

    await waitUntil(() =>
      expect(recordReviewRunMilestone).toHaveBeenCalledWith(
        "run-1",
        "failed",
        expect.objectContaining({ errorClass: "error" }),
      ),
    );
    expect(markReviewRunSavedVersion).not.toHaveBeenCalled();
  });

  async function renderPageCard({
    backend,
  }: {
    backend: StorageBackend;
  }): Promise<{
    container: HTMLDivElement;
    onSave: ReturnType<typeof vi.fn>;
    getEditor: () => Editor;
    getSaveController: () => DocumentSaveController;
  }> {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const onSave = vi.fn(async () => ({ ...TEST_PAGE, version: "v1" }));
    let editor: Editor | null = null;
    let saveController: DocumentSaveController | null = null;

    await act(async () => {
      root?.render(
        createElement(PageCard, {
          page: TEST_PAGE,
          activeDocumentPath: "draft.md",
          selected: true,
          editorViewMode: "rich-text",
          interactionMode: "editing",
          onSave,
          onEditorReady: (nextEditor: Editor | null) => {
            editor = nextEditor;
          },
          onSaveControllerChange: (
            nextController: DocumentSaveController | null,
          ) => {
            saveController = nextController;
          },
          onSaveStateChange: () => {},
          backend,
        }),
      );
      await Promise.resolve();
    });

    return {
      container,
      onSave,
      getEditor() {
        expect(editor).not.toBeNull();
        return editor as Editor;
      },
      getSaveController() {
        expect(saveController).not.toBeNull();
        return saveController as DocumentSaveController;
      },
    };
  }
});

const TEST_PAGE: Page = {
  id: "doc-voice",
  title: "Voice Doc",
  content: "This has target text.",
  version: "v1",
};
