import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiBackend } from "./api-backend";

describe("ApiBackend review loop", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses proof-bearing review-loop endpoints for voice runs and handoff", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : {};

        if (url.startsWith("/api/review-loop/runs?")) {
          expect(body.selection).toMatchObject({
            from: 1,
            to: 7,
            selectedText: "target",
          });
          return jsonResponse({ runId: "run-1", roundId: null });
        }

        if (url === "/api/review-loop/runs/run-1/milestones") {
          expect(body).toMatchObject({ milestone: "save_started" });
          return jsonResponse({ runId: "run-1", milestones: [body] });
        }

        if (url === "/api/review-loop/runs/run-1/saved-version") {
          expect(body).toMatchObject({
            path: "draft.md",
            savedVersion: "v2",
          });
          return jsonResponse({
            run: { runId: "run-1", savedVersion: "v2" },
            round: { roundId: "round-1", savedVersion: "v2" },
          });
        }

        if (url.startsWith("/api/review-loop/status?")) {
          return jsonResponse({
            openRound: { roundId: "round-1", savedVersion: "v2" },
            activeRuns: [],
            recentHandoffs: [],
          });
        }

        if (url.startsWith("/api/review-loop/complete?")) {
          expect(body).toMatchObject({ path: "draft.md", roundId: "round-1" });
          return jsonResponse({
            handoff: { handoffId: "handoff-1", roundId: "round-1" },
            reviewEvent: {
              delivered: true,
              event: { type: "review.completed", savedVersion: "v2" },
              delivery: {
                state: "delivered",
                watchers: [{ sessionId: "watcher-1", source: "cli-follow" }],
              },
            },
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      },
    );
    global.fetch = fetchMock;
    const backend = new ApiBackend({
      kind: "local-files",
      label: "Local",
      detail: "Project",
      projectPath: "/tmp/project",
    });

    await expect(
      backend.createReviewRun("draft.md", {
        from: 1,
        to: 7,
        selectedText: "target",
      }),
    ).resolves.toMatchObject({ runId: "run-1" });
    await expect(
      backend.recordReviewRunMilestone("run-1", "save_started"),
    ).resolves.toMatchObject({ runId: "run-1" });
    await expect(
      backend.markReviewRunSavedVersion("run-1", "draft.md", "v2"),
    ).resolves.toMatchObject({
      round: { roundId: "round-1", savedVersion: "v2" },
    });
    await expect(
      backend.getReviewLoopStatus("draft.md"),
    ).resolves.toMatchObject({
      openRound: { roundId: "round-1", savedVersion: "v2" },
    });
    await expect(
      backend.completeReview("draft.md", { roundId: "round-1" }),
    ).resolves.toMatchObject({
      delivered: true,
      handoff: { handoffId: "handoff-1" },
      delivery: {
        state: "delivered",
        watchers: [{ sessionId: "watcher-1", source: "cli-follow" }],
      },
    });
  });

  it("does not fall back to legacy review events without a saved round id", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const backend = new ApiBackend({
      kind: "local-files",
      label: "Local",
      detail: "Project",
      projectPath: "/tmp/project",
    });

    await expect(backend.completeReview("draft.md")).resolves.toEqual({
      delivered: false,
      reason: "missing_review_round",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
