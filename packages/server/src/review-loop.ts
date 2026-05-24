import crypto from "node:crypto";
import path from "node:path";

export type ReviewLoopMilestone =
  | "recording_started"
  | "stopping"
  | "transcribing"
  | "transcript_received"
  | "classification_requested"
  | "classification_completed"
  | "edit_applied"
  | "save_started"
  | "saved"
  | "discarded"
  | "failed";

export interface ReviewLoopSelectionInput {
  from?: number;
  to?: number;
  selectedText: string;
}

export interface CreateReviewRunInput {
  documentPath: string;
  projectPath: string;
  relativePath: string;
  selection: ReviewLoopSelectionInput;
  preActionVersion: string;
  now?: number;
}

export interface ReviewLoopMilestoneRecord {
  name: ReviewLoopMilestone;
  at: string;
  durationMs?: number;
  errorClass?: string;
}

export interface ReviewRunProof {
  runId: string;
  roundId: string | null;
  documentPath: string;
  projectPath: string;
  relativePath: string;
  selectionHash: string;
  selectionLength: number;
  selectionRange: {
    from?: number;
    to?: number;
  };
  preActionVersion: string;
  savedVersion: string | null;
  status: "active" | "saved" | "discarded" | "failed";
  createdAt: string;
  updatedAt: string;
  milestones: ReviewLoopMilestoneRecord[];
  pruneAt: string;
}

export interface ReviewRoundProof {
  roundId: string;
  documentPath: string;
  projectPath: string;
  relativePath: string;
  runIds: string[];
  savedVersion: string | null;
  status: "open" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface ReviewHandoffProof {
  handoffId: string;
  roundId: string;
  documentPath: string;
  projectPath: string;
  relativePath: string;
  runIds: string[];
  savedVersion: string;
  handoffAt: string;
}

export interface ReviewLoopStatus {
  documentPath: string;
  projectPath: string | null;
  relativePath: string | null;
  openRound: ReviewRoundProof | null;
  activeRuns: ReviewRunProof[];
  recentHandoffs: ReviewHandoffProof[];
}

interface ReviewLoopProofHelperOptions {
  ttlMs?: number;
  maxRecentHandoffs?: number;
  idFactory?: () => string;
  now?: () => number;
}

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MAX_RECENT_HANDOFFS = 20;

function isoTime(ms: number): string {
  return new Date(ms).toISOString();
}

function hashSelectedText(selectedText: string): string {
  return crypto.createHash("sha256").update(selectedText).digest("hex");
}

function normalizeDocumentPath(documentPath: string): string {
  return path.resolve(documentPath);
}

export class ReviewLoopProofHelper {
  private activeRunsById = new Map<string, ReviewRunProof>();
  private openRoundByDocument = new Map<string, ReviewRoundProof>();
  private recentHandoffById = new Map<string, ReviewHandoffProof>();
  private readonly ttlMs: number;
  private readonly maxRecentHandoffs: number;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: ReviewLoopProofHelperOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxRecentHandoffs =
      options.maxRecentHandoffs ?? DEFAULT_MAX_RECENT_HANDOFFS;
    this.idFactory = options.idFactory ?? crypto.randomUUID;
    this.now = options.now ?? Date.now;
  }

  createRun(input: CreateReviewRunInput): ReviewRunProof {
    this.pruneExpired();
    const now = input.now ?? this.now();
    const selectedText = input.selection.selectedText;
    if (selectedText.length === 0) {
      throw new Error("selection.selectedText is required");
    }

    const run: ReviewRunProof = {
      runId: this.idFactory(),
      roundId: null,
      documentPath: normalizeDocumentPath(input.documentPath),
      projectPath: path.resolve(input.projectPath),
      relativePath: input.relativePath,
      selectionHash: hashSelectedText(selectedText),
      selectionLength: selectedText.length,
      selectionRange: {
        from: input.selection.from,
        to: input.selection.to,
      },
      preActionVersion: input.preActionVersion,
      savedVersion: null,
      status: "active",
      createdAt: isoTime(now),
      updatedAt: isoTime(now),
      milestones: [],
      pruneAt: isoTime(now + this.ttlMs),
    };
    this.activeRunsById.set(run.runId, run);
    return structuredClone(run);
  }

  recordMilestone(
    runId: string,
    name: ReviewLoopMilestone,
    options: { at?: number; durationMs?: number; errorClass?: string } = {},
  ): ReviewRunProof {
    const run = this.requireRun(runId);
    const at = options.at ?? this.now();
    run.milestones.push({
      name,
      at: isoTime(at),
      durationMs: options.durationMs,
      errorClass: options.errorClass,
    });
    run.updatedAt = isoTime(at);
    if (name === "save_started") this.attachRunToOpenRound(run, at);
    if (name === "discarded") run.status = "discarded";
    if (name === "discarded") this.removeRunFromRound(run);
    if (name === "failed") run.status = "failed";
    return structuredClone(run);
  }

  markSavedVersion(
    runId: string,
    savedVersion: string,
    options: { at?: number } = {},
  ): { run: ReviewRunProof; round: ReviewRoundProof } {
    if (savedVersion.trim().length === 0) {
      throw new Error("savedVersion is required");
    }
    const run = this.requireRun(runId);
    const now = options.at ?? this.now();
    const round = this.attachRunToOpenRound(run, now);
    run.savedVersion = savedVersion;
    run.status = "saved";
    run.updatedAt = isoTime(now);
    run.pruneAt = isoTime(now + this.ttlMs);
    round.savedVersion = savedVersion;
    round.updatedAt = isoTime(now);
    this.recordMilestone(runId, "saved", { at: now });
    return {
      run: structuredClone(run),
      round: structuredClone(round),
    };
  }

  completeRound(
    documentPath: string,
    roundId: string,
    options: { currentVersion?: string } = {},
  ): ReviewHandoffProof {
    this.pruneExpired();
    if (roundId.trim().length === 0) {
      throw new Error("roundId is required");
    }
    const normalizedPath = normalizeDocumentPath(documentPath);
    const round = this.openRoundByDocument.get(normalizedPath);
    if (!round) {
      throw new Error("no open review round");
    }
    if (round.roundId !== roundId) {
      throw new Error("review round mismatch");
    }

    const runs = round.runIds.map((runId) => this.requireRun(runId));
    const unsaved = runs.filter((run) => run.status !== "saved");
    if (unsaved.length > 0 || !round.savedVersion) {
      throw new Error("review round has unsaved runs");
    }
    if (options.currentVersion && round.savedVersion !== options.currentVersion) {
      throw new Error("saved version no longer matches current file version");
    }

    const now = this.now();
    round.status = "completed";
    round.updatedAt = isoTime(now);
    this.openRoundByDocument.delete(normalizedPath);

    const handoff: ReviewHandoffProof = {
      handoffId: this.idFactory(),
      roundId: round.roundId,
      documentPath: round.documentPath,
      projectPath: round.projectPath,
      relativePath: round.relativePath,
      runIds: [...round.runIds],
      savedVersion: round.savedVersion,
      handoffAt: isoTime(now),
    };
    this.recentHandoffById.set(handoff.handoffId, handoff);
    this.pruneRecentHandoffs();
    return structuredClone(handoff);
  }

  statusForDocument(documentPath: string): ReviewLoopStatus {
    this.pruneExpired();
    const normalizedPath = normalizeDocumentPath(documentPath);
    const runs = [...this.activeRunsById.values()].filter(
      (run) => run.documentPath === normalizedPath,
    );
    const newestRun = runs.at(-1);
    const openRound = this.openRoundByDocument.get(normalizedPath) ?? null;
    return {
      documentPath: normalizedPath,
      projectPath: newestRun?.projectPath ?? openRound?.projectPath ?? null,
      relativePath: newestRun?.relativePath ?? openRound?.relativePath ?? null,
      openRound: structuredClone(openRound),
      activeRuns: structuredClone(runs),
      recentHandoffs: structuredClone(
        [...this.recentHandoffById.values()].filter(
          (handoff) => handoff.documentPath === normalizedPath,
        ),
      ),
    };
  }

  runForId(runId: string): ReviewRunProof {
    return structuredClone(this.requireRun(runId));
  }

  private attachRunToOpenRound(
    run: ReviewRunProof,
    now: number,
  ): ReviewRoundProof {
    const round = this.openOrCreateRound(run, now);
    run.roundId = round.roundId;
    if (!round.runIds.includes(run.runId)) {
      round.runIds.push(run.runId);
    }
    round.updatedAt = isoTime(now);
    return round;
  }

  private removeRunFromRound(run: ReviewRunProof): void {
    if (!run.roundId) return;
    const round = this.openRoundByDocument.get(run.documentPath);
    if (!round || round.roundId !== run.roundId) return;
    round.runIds = round.runIds.filter((runId) => runId !== run.runId);
    round.updatedAt = isoTime(this.now());
    run.roundId = null;
    if (round.runIds.length === 0) {
      this.openRoundByDocument.delete(run.documentPath);
    }
  }

  private openOrCreateRound(
    run: ReviewRunProof,
    now: number,
  ): ReviewRoundProof {
    const existing = this.openRoundByDocument.get(run.documentPath);
    if (existing) return existing;

    const round: ReviewRoundProof = {
      roundId: this.idFactory(),
      documentPath: run.documentPath,
      projectPath: run.projectPath,
      relativePath: run.relativePath,
      runIds: [],
      savedVersion: null,
      status: "open",
      createdAt: isoTime(now),
      updatedAt: isoTime(now),
    };
    this.openRoundByDocument.set(run.documentPath, round);
    return round;
  }

  private requireRun(runId: string): ReviewRunProof {
    const run = this.activeRunsById.get(runId);
    if (!run) {
      throw new Error("review run not found");
    }
    return run;
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [runId, run] of this.activeRunsById) {
      if (Date.parse(run.pruneAt) <= now) {
        this.removeRunFromRound(run);
        this.activeRunsById.delete(runId);
      }
    }
  }

  private pruneRecentHandoffs(): void {
    const handoffs = [...this.recentHandoffById.entries()];
    const excess = handoffs.length - this.maxRecentHandoffs;
    if (excess <= 0) return;
    for (const [handoffId] of handoffs.slice(0, excess)) {
      this.recentHandoffById.delete(handoffId);
    }
  }
}
