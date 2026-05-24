import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ReviewCompletedEventInput {
  documentPath: string;
  projectPath: string;
  relativePath: string;
  version: string;
  handoffId?: string;
  roundId?: string;
  runIds?: string[];
  savedVersion?: string;
  handoffAt?: string;
  summary: {
    comments: number;
    replies: number;
    suggestions: number;
    unresolved: number;
  };
}

export interface ReviewCompletedEvent extends ReviewCompletedEventInput {
  type: "review.completed";
  sequence: number;
  createdAt: string;
}

export interface WaitForReviewEventsOptions {
  documentPath?: string;
  afterSequence?: number;
  timeoutMs?: number;
  batchWindowMs?: number;
  source?: string;
}

export interface WaitForReviewEventsResult {
  events: ReviewCompletedEvent[];
  timedOut: boolean;
  nextSequence: number;
}

interface Waiter {
  options: NormalizedWaitOptions;
  resolve: (result: WaitForReviewEventsResult) => void;
  timeout: NodeJS.Timeout | null;
  batchTimeout: NodeJS.Timeout | null;
  session: ReviewWatcherSession;
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

export interface ReviewEventEmitResult {
  delivered: boolean;
  event: ReviewCompletedEvent;
  delivery: ReviewEventDelivery;
}

export interface ReviewFollowPayload {
  type: "review.completed";
  event: ReviewCompletedEvent;
  watcher: ReviewWatcherSession;
  deliveryState: "delivered";
}

export interface FollowReviewEventsOptions {
  documentPath?: string;
  source?: string;
}

export interface FollowReviewEventsSession {
  session: ReviewWatcherSession;
  stop: () => void;
}

interface FollowWatcher {
  options: NormalizedFollowOptions;
  session: ReviewWatcherSession;
  onEvent: (payload: ReviewFollowPayload) => void;
}

const DEFAULT_BATCH_WINDOW_MS = 250;
const MAX_RETAINED_EVENTS = 100;

type NormalizedWaitOptions = Required<
  Omit<WaitForReviewEventsOptions, "documentPath" | "timeoutMs" | "source">
> & {
  documentPath?: string;
  timeoutMs?: number;
  source: string;
};

type NormalizedFollowOptions = {
  documentPath?: string;
  source: string;
};

interface ReviewEventQueueOptions {
  idFactory?: () => string;
  now?: () => number;
}

export class ReviewEventQueue {
  private events: ReviewCompletedEvent[] = [];
  private waiters = new Set<Waiter>();
  private followWatchers = new Map<string, FollowWatcher>();
  private nextSequence = 1;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: ReviewEventQueueOptions = {}) {
    this.idFactory = options.idFactory ?? cryptoRandomId;
    this.now = options.now ?? Date.now;
  }

  emit(input: ReviewCompletedEventInput): ReviewEventEmitResult {
    const deliveredWatchers: ReviewWatcherSession[] = [];
    const event: ReviewCompletedEvent = {
      ...input,
      type: "review.completed",
      sequence: this.nextSequence,
      createdAt: this.isoNow(),
    };
    this.nextSequence += 1;
    this.events.push(event);
    this.events = this.events.slice(-MAX_RETAINED_EVENTS);

    appendSlog("review-events.emit", {
      documentPath: event.documentPath,
      sequence: event.sequence,
      waiters: this.waiters.size,
    });

    let delivered = false;
    for (const waiter of [...this.waiters]) {
      if (matchesWaiter(event, waiter.options)) {
        delivered = true;
        markDelivered(waiter.session, this.isoNow());
        deliveredWatchers.push(cloneSession(waiter.session));
        this.scheduleResolve(waiter);
      }
    }

    for (const watcher of this.followWatchers.values()) {
      if (!matchesFollowWatcher(event, watcher.options)) continue;
      delivered = true;
      markDelivered(watcher.session, this.isoNow());
      const watcherSession = cloneSession(watcher.session);
      deliveredWatchers.push(watcherSession);
      watcher.onEvent({
        type: "review.completed",
        event,
        watcher: watcherSession,
        deliveryState: "delivered",
      });
    }

    return {
      delivered,
      event,
      delivery: {
        state: delivered ? "delivered" : "no_watcher",
        watchers: deliveredWatchers,
      },
    };
  }

  wait(
    options: WaitForReviewEventsOptions = {},
  ): Promise<WaitForReviewEventsResult> {
    const normalized = normalizeWaitOptions(options);
    const existing = this.matchingEvents(normalized);

    if (existing.length > 0) {
      return Promise.resolve(
        resultForEvents(existing, false, this.nextSequence),
      );
    }

    return new Promise((resolve) => {
      const waiter: Waiter = {
        options: normalized,
        resolve,
        batchTimeout: null,
        session: this.createSession(normalized),
        timeout:
          normalized.timeoutMs !== undefined
            ? setTimeout(() => {
                this.resolveWaiter(waiter, true);
              }, normalized.timeoutMs)
            : null,
      };

      this.waiters.add(waiter);
      appendSlog("review-events.wait", {
        documentPath: normalized.documentPath ?? null,
        afterSequence: normalized.afterSequence,
        timeoutMs: normalized.timeoutMs,
      });
    });
  }

  follow(
    options: FollowReviewEventsOptions,
    onEvent: (payload: ReviewFollowPayload) => void,
  ): FollowReviewEventsSession {
    const normalized = normalizeFollowOptions(options);
    const session = this.createSession(normalized);
    const watcher: FollowWatcher = {
      options: normalized,
      session,
      onEvent,
    };
    this.followWatchers.set(session.sessionId, watcher);
    appendSlog("review-events.follow", {
      documentPath: normalized.documentPath ?? null,
      sessionId: session.sessionId,
      source: session.source,
    });
    return {
      session: cloneSession(session),
      stop: () => {
        this.stopFollow(session.sessionId);
      },
    };
  }

  waiterCount(): number {
    return this.waiters.size + this.followWatchers.size;
  }

  latestSequence(): number {
    return this.nextSequence - 1;
  }

  waiterCountForDocument(documentPath: string): number {
    const normalizedPath = path.resolve(documentPath);
    return this.watchersForDocument(normalizedPath).length;
  }

  statusForDocument(documentPath: string): {
    documentPath: string;
    watching: boolean;
    watcherCount: number;
    watchers: ReviewWatcherSession[];
  } {
    const normalizedPath = path.resolve(documentPath);
    const watchers = this.watchersForDocument(normalizedPath);
    return {
      documentPath: normalizedPath,
      watching: watchers.length > 0,
      watcherCount: watchers.length,
      watchers,
    };
  }

  private matchingEvents(
    options: NormalizedWaitOptions,
  ): ReviewCompletedEvent[] {
    return this.events.filter((event) => matchesWaiter(event, options));
  }

  private scheduleResolve(waiter: Waiter): void {
    if (waiter.batchTimeout) return;

    if (waiter.timeout) {
      clearTimeout(waiter.timeout);
      waiter.timeout = null;
    }

    waiter.batchTimeout = setTimeout(() => {
      this.resolveWaiter(waiter, false);
    }, waiter.options.batchWindowMs);
  }

  private resolveWaiter(waiter: Waiter, timedOut: boolean): void {
    if (!this.waiters.has(waiter)) return;

    this.waiters.delete(waiter);
    if (waiter.timeout) {
      clearTimeout(waiter.timeout);
    }
    if (waiter.batchTimeout) {
      clearTimeout(waiter.batchTimeout);
    }

    const events = timedOut ? [] : this.matchingEvents(waiter.options);
    waiter.session.state = timedOut ? "stopped" : "delivered";
    waiter.resolve(resultForEvents(events, timedOut, this.nextSequence));
  }

  private createSession(options: {
    documentPath?: string;
    source: string;
  }): ReviewWatcherSession {
    return {
      sessionId: this.idFactory(),
      source: options.source,
      documentPath: options.documentPath ?? null,
      startedAt: this.isoNow(),
      lastDeliveredAt: null,
      state: "waiting",
    };
  }

  private isoNow(): string {
    return new Date(this.now()).toISOString();
  }

  private stopFollow(sessionId: string): void {
    const watcher = this.followWatchers.get(sessionId);
    if (!watcher) return;
    watcher.session.state = "stopped";
    this.followWatchers.delete(sessionId);
  }

  private watchersForDocument(documentPath: string): ReviewWatcherSession[] {
    const waiting = [...this.waiters]
      .filter((waiter) => waiter.options.documentPath === documentPath)
      .map((waiter) => cloneSession(waiter.session));
    const following = [...this.followWatchers.values()]
      .filter((watcher) => watcher.options.documentPath === documentPath)
      .map((watcher) => cloneSession(watcher.session));
    return [...waiting, ...following];
  }
}

function normalizeWaitOptions(
  options: WaitForReviewEventsOptions,
): NormalizedWaitOptions {
  return {
    documentPath: options.documentPath
      ? path.resolve(options.documentPath)
      : undefined,
    afterSequence: Math.max(0, options.afterSequence ?? 0),
    source: normalizeSource(options.source, "one-shot"),
    timeoutMs:
      options.timeoutMs !== undefined
        ? clamp(options.timeoutMs, 0, 300_000)
        : undefined,
    batchWindowMs: clamp(
      options.batchWindowMs ?? DEFAULT_BATCH_WINDOW_MS,
      0,
      10_000,
    ),
  };
}

function normalizeFollowOptions(
  options: FollowReviewEventsOptions,
): NormalizedFollowOptions {
  return {
    documentPath: options.documentPath
      ? path.resolve(options.documentPath)
      : undefined,
    source: normalizeSource(options.source, "follow"),
  };
}

function matchesWaiter(
  event: ReviewCompletedEvent,
  options: NormalizedWaitOptions,
): boolean {
  if (event.sequence <= options.afterSequence) return false;
  if (!options.documentPath) return true;
  return path.resolve(event.documentPath) === options.documentPath;
}

function matchesFollowWatcher(
  event: ReviewCompletedEvent,
  options: NormalizedFollowOptions,
): boolean {
  if (!options.documentPath) return true;
  return path.resolve(event.documentPath) === options.documentPath;
}

function markDelivered(session: ReviewWatcherSession, at: string): void {
  session.lastDeliveredAt = at;
  session.state = "delivered";
}

function cloneSession(session: ReviewWatcherSession): ReviewWatcherSession {
  return { ...session };
}

function normalizeSource(source: string | undefined, fallback: string): string {
  const trimmed = source?.trim();
  return trimmed ? trimmed.slice(0, 80) : fallback;
}

function cryptoRandomId(): string {
  return crypto.randomUUID();
}

function resultForEvents(
  events: ReviewCompletedEvent[],
  timedOut: boolean,
  nextSequence: number,
): WaitForReviewEventsResult {
  return {
    events,
    timedOut,
    nextSequence,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function appendSlog(event: string, data: Record<string, unknown>): void {
  const file = process.env.THOUGHTFUL_SLOG_FILE;
  if (!file) return;

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(
    file,
    `${JSON.stringify({
      ts: new Date().toISOString(),
      runId: process.env.THOUGHTFUL_SLOG_RUN_ID ?? "manual",
      source: "packages/server/src/review-events.ts",
      event,
      data,
    })}\n`,
  );
}
