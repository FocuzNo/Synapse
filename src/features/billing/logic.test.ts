import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateUsagePercentage,
  canRemoveBrandingOnPlan,
  getPlanChangeDirection,
  isConversationRetainedAt,
  resolveWorkspacePlan,
} from "@/features/billing/logic";

test("resolveWorkspacePlan falls back to free", () => {
  assert.equal(resolveWorkspacePlan(undefined), "free");
  assert.equal(resolveWorkspacePlan(null), "free");
  assert.equal(resolveWorkspacePlan("pro"), "pro");
});

test("getPlanChangeDirection distinguishes upgrade downgrade and same", () => {
  assert.equal(getPlanChangeDirection("free", "starter"), "upgrade");
  assert.equal(getPlanChangeDirection("pro", "starter"), "downgrade");
  assert.equal(getPlanChangeDirection("starter", "starter"), "same");
});

test("Free cannot remove branding while paid plans can", () => {
  assert.equal(canRemoveBrandingOnPlan("free"), false);
  assert.equal(canRemoveBrandingOnPlan("starter"), true);
  assert.equal(canRemoveBrandingOnPlan("pro"), true);
});

test("calculateUsagePercentage clamps between 0 and 100", () => {
  assert.equal(calculateUsagePercentage(1, 4), 25);
  assert.equal(calculateUsagePercentage(999, 100), 100);
  assert.equal(calculateUsagePercentage(-5, 100), 0);
});

test("conversation retention follows plan windows", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");

  assert.equal(
    isConversationRetainedAt("free", "2026-07-10T12:00:00.000Z", now),
    true
  );
  assert.equal(
    isConversationRetainedAt("free", "2026-07-01T11:59:59.000Z", now),
    false
  );
  assert.equal(
    isConversationRetainedAt("starter", "2026-04-15T12:00:00.000Z", now),
    true
  );
  assert.equal(
    isConversationRetainedAt("starter", "2026-03-01T12:00:00.000Z", now),
    false
  );
  assert.equal(
    isConversationRetainedAt("pro", "2025-01-01T00:00:00.000Z", now),
    true
  );
});
