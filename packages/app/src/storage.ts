export interface Page {
  id: string;
  title: string;
  content: string;
  version?: string;
}

export interface MarkdownFileChangeEvent {
  path: string;
  exists: boolean;
  version: string | null;
}

export class MarkdownFileConflictError extends Error {
  current: Page;

  constructor(current: Page) {
    super("Markdown file changed on disk");
    this.name = "MarkdownFileConflictError";
    this.current = current;
  }
}

export interface StoredAsset {
  markdownPath: string;
  previewUrl: string;
  mimeType: string;
}

export interface CompleteReviewResult {
  delivered: boolean;
  event?: ReviewCompletedEvent;
  handoff?: ReviewHandoffProof;
  delivery?: ReviewEventDelivery;
  reason?: "missing_review_round" | "save_blocked" | "not_supported";
}

export interface ReviewWatchStatus {
  watching: boolean;
  watcherCount: number;
  watchers: ReviewWatcherSession[];
}

export interface VoiceSelectionSnapshot {
  from: number;
  to: number;
  selectedText: string;
}

export type VoiceActionType =
  | "comment"
  | "suggestion_addition"
  | "suggestion_deletion"
  | "suggestion_substitution";

export interface VoiceActionResult {
  action: VoiceActionType;
  content: string;
  replacementText?: string;
  confidence: number;
  uncertain?: boolean;
}

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

export interface ReviewWatcherSession {
  sessionId: string;
  source: string;
  documentPath: string | null;
  startedAt: string;
  lastDeliveredAt: string | null;
  state: "waiting" | "delivered" | "stopped";
}

export interface ReviewEventDelivery {
  state: "delivered" | "no_watcher";
  watchers: ReviewWatcherSession[];
}

export interface ReviewCompletedEvent {
  type: "review.completed";
  sequence: number;
  createdAt: string;
  documentPath: string;
  projectPath: string;
  relativePath: string;
  version: string;
  handoffId?: string;
  roundId?: string;
  runIds?: string[];
  savedVersion?: string;
  handoffAt?: string;
}

export interface BackendInfo {
  kind: "local-files" | "local-storage" | "remote";
  label: string;
  detail: string;
  projectPath?: string;
  sessionId?: string;
  originPath?: string;
}

export interface StorageBackend {
  info: BackendInfo;
  canManageProjects: boolean;
  getMarkdownFile(relativePath: string): Promise<Page>;
  saveMarkdownFile(
    relativePath: string,
    content: string,
    expectedVersion?: string,
  ): Promise<Page | undefined>;
  watchMarkdownFile?(
    relativePath: string,
    onChange: (event: MarkdownFileChangeEvent) => void,
  ): () => void;
  createReviewRun?(
    relativePath: string,
    selection: VoiceSelectionSnapshot,
  ): Promise<ReviewRunProof>;
  recordReviewRunMilestone?(
    runId: string,
    milestone: ReviewLoopMilestone,
    options?: { durationMs?: number; errorClass?: string },
  ): Promise<ReviewRunProof>;
  markReviewRunSavedVersion?(
    runId: string,
    relativePath: string,
    savedVersion: string,
  ): Promise<{ run: ReviewRunProof; round: ReviewRoundProof }>;
  getReviewLoopStatus?(relativePath: string): Promise<ReviewLoopStatus>;
  completeReview?(
    relativePath: string,
    options?: { roundId?: string },
  ): Promise<CompleteReviewResult>;
  getReviewWatchStatus?(relativePath: string): Promise<ReviewWatchStatus>;
  processVoiceUtterance?(
    relativePath: string,
    utterance: string,
    selection: VoiceSelectionSnapshot,
  ): Promise<VoiceActionResult>;
  saveAsset(file: File): Promise<StoredAsset>;
  resolveFileUrl(path: string): string | null;
  openProject(path: string): Promise<void>;
}
