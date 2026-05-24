import { describe, expect, it } from "vitest";
import { VOICE_REVIEW_TIMELINE_STAGES } from "./PageCard";

describe("PageCard voice review timeline", () => {
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
});
