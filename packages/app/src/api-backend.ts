import {
  MarkdownFileConflictError,
  type BackendInfo,
  type CompleteReviewResult,
  type MarkdownFileChangeEvent,
  type Page,
  type ReviewLoopMilestone,
  type ReviewLoopStatus,
  type ReviewRoundProof,
  type ReviewRunProof,
  type ReviewWatchStatus,
  type StorageBackend,
  type StoredAsset,
  type VoiceActionResult,
  type VoiceSelectionSnapshot,
} from "./storage";

export class ApiBackend implements StorageBackend {
  info: BackendInfo;
  canManageProjects = true;

  constructor(info: BackendInfo) {
    this.info = info;
  }

  private updateProjectInfo(projectPath?: string): void {
    this.info = {
      ...this.info,
      detail: projectPath || "Markdown file on disk",
      projectPath,
    };
  }

  private buildUrl(route: string, params?: Record<string, string>): string {
    const url = new URL(route, window.location.origin);
    const projectPath = this.info.projectPath?.trim();

    if (projectPath) {
      url.searchParams.set("projectPath", projectPath);
    }

    Object.entries(params ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return `${url.pathname}${url.search}`;
  }

  async getMarkdownFile(relativePath: string): Promise<Page> {
    const res = await fetch(
      this.buildUrl("/api/markdown-file", {
        path: relativePath,
      }),
    );
    if (!res.ok) {
      throw new Error(
        `Failed to get markdown file ${relativePath}: ${res.status}`,
      );
    }
    return res.json();
  }

  async saveMarkdownFile(
    relativePath: string,
    content: string,
    expectedVersion?: string,
  ): Promise<Page> {
    const res = await fetch(
      this.buildUrl("/api/markdown-file", { path: relativePath }),
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expectedVersion,
          projectPath: this.info.projectPath,
        }),
      },
    );
    if (res.status === 409) {
      const payload = (await res.json()) as { current?: Page };
      if (payload.current) {
        throw new MarkdownFileConflictError(payload.current);
      }
    }
    if (!res.ok) {
      throw new Error(
        `Failed to save markdown file ${relativePath}: ${res.status}`,
      );
    }
    return res.json();
  }

  watchMarkdownFile(
    relativePath: string,
    onChange: (event: MarkdownFileChangeEvent) => void,
  ): () => void {
    const source = new EventSource(
      this.buildUrl("/api/markdown-file/events", { path: relativePath }),
    );

    source.addEventListener("change", (event) => {
      try {
        onChange(JSON.parse((event as MessageEvent<string>).data));
      } catch (error) {
        console.error("Failed to read markdown file change event:", error);
      }
    });

    source.onerror = (error) => {
      console.error("Markdown file event stream failed:", error);
    };

    return () => {
      source.close();
    };
  }

  async createReviewRun(
    relativePath: string,
    selection: VoiceSelectionSnapshot,
  ): Promise<ReviewRunProof> {
    const res = await fetch(
      this.buildUrl("/api/review-loop/runs", { path: relativePath }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath: this.info.projectPath,
          path: relativePath,
          selection,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to create review run ${relativePath}: ${res.status}`,
      );
    }

    return res.json();
  }

  async recordReviewRunMilestone(
    runId: string,
    milestone: ReviewLoopMilestone,
    options: { durationMs?: number; errorClass?: string } = {},
  ): Promise<ReviewRunProof> {
    const res = await fetch(`/api/review-loop/runs/${runId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone,
        durationMs: options.durationMs,
        errorClass: options.errorClass,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to record review milestone ${runId}: ${res.status}`);
    }

    return res.json();
  }

  async markReviewRunSavedVersion(
    runId: string,
    relativePath: string,
    savedVersion: string,
  ): Promise<{ run: ReviewRunProof; round: ReviewRoundProof }> {
    const res = await fetch(`/api/review-loop/runs/${runId}/saved-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectPath: this.info.projectPath,
        path: relativePath,
        savedVersion,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to bind saved review version ${runId}: ${res.status}`,
      );
    }

    return res.json();
  }

  async getReviewLoopStatus(relativePath: string): Promise<ReviewLoopStatus> {
    const res = await fetch(
      this.buildUrl("/api/review-loop/status", { path: relativePath }),
    );

    if (!res.ok) {
      throw new Error(
        `Failed to get review loop status ${relativePath}: ${res.status}`,
      );
    }

    return res.json();
  }

  async completeReview(
    relativePath: string,
    options: { roundId?: string } = {},
  ): Promise<CompleteReviewResult> {
    if (!options.roundId) {
      return { delivered: false, reason: "missing_review_round" };
    }

    const res = await fetch(
      this.buildUrl("/api/review-loop/complete", { path: relativePath }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectPath: this.info.projectPath,
          path: relativePath,
          roundId: options.roundId,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to complete review ${relativePath}: ${res.status}`,
      );
    }

    const payload = (await res.json()) as CompleteReviewResult & {
      reviewEvent?: CompleteReviewResult;
    };
    return {
      ...payload.reviewEvent,
      handoff: payload.handoff,
      delivered: payload.reviewEvent?.delivered === true,
    };
  }

  async getReviewWatchStatus(relativePath: string): Promise<ReviewWatchStatus> {
    const res = await fetch(
      this.buildUrl("/api/review-events/status", { path: relativePath }),
    );

    if (!res.ok) {
      throw new Error(
        `Failed to get review watch status ${relativePath}: ${res.status}`,
      );
    }

    const payload = (await res.json()) as {
      watching?: unknown;
      watcherCount?: unknown;
      watchers?: unknown;
    };
    return {
      watching: payload.watching === true,
      watcherCount:
        typeof payload.watcherCount === "number" ? payload.watcherCount : 0,
      watchers: Array.isArray(payload.watchers)
        ? (payload.watchers as ReviewWatchStatus["watchers"])
        : [],
    };
  }

  async processVoiceUtterance(
    relativePath: string,
    utterance: string,
    selection: VoiceSelectionSnapshot,
  ): Promise<VoiceActionResult> {
    const res = await fetch(this.buildUrl("/api/voice/process"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectPath: this.info.projectPath,
        path: relativePath,
        utterance,
        selection,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to process voice utterance for ${relativePath}: ${res.status}`,
      );
    }

    return res.json();
  }

  async saveAsset(file: File): Promise<StoredAsset> {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < bytes.length; index += 1) {
      const byte = bytes[index];
      if (byte === undefined) continue;
      binary += String.fromCharCode(byte);
    }

    const res = await fetch(this.buildUrl("/api/assets"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64: btoa(binary),
        projectPath: this.info.projectPath,
      }),
    });

    if (!res.ok) throw new Error(`Failed to save asset: ${res.status}`);
    return res.json();
  }

  resolveFileUrl(path: string): string | null {
    const normalized = path.replace(/^\.?\//, "");
    return this.buildUrl("/api/files", { path: normalized });
  }

  async openProject(path: string): Promise<void> {
    this.updateProjectInfo(path);
  }
}
