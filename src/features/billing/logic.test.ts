import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateUsagePercentage,
  canAccessAnalyticsOnPlan,
  canCreateChatbotOnPlan,
  canRemoveBrandingOnPlan,
  canSendMessageOnPlan,
  canUploadDocumentOnPlan,
  getPlanChangeDirection,
  isConversationRetainedAt,
  resolveWorkspacePlan,
} from "@/features/billing/logic";
import { changePlanSchema } from "@/features/billing/schemas";

test("resolveWorkspacePlan falls back to free", () => {
  assert.equal(resolveWorkspacePlan(undefined), "free");
  assert.equal(resolveWorkspacePlan(null), "free");
  assert.equal(resolveWorkspacePlan("pro"), "pro");
});

test("changePlanSchema accepts only known plans and strips client-supplied price fields", () => {
  assert.equal(changePlanSchema.safeParse({ plan: "starter" }).success, true);
  assert.equal(changePlanSchema.safeParse({ plan: "enterprise" }).success, false);
  assert.deepEqual(changePlanSchema.parse({ plan: "starter", price: 1 }), {
    plan: "starter",
  });
});

test("getPlanChangeDirection distinguishes upgrade downgrade and same", () => {
  assert.equal(getPlanChangeDirection("free", "starter"), "upgrade");
  assert.equal(getPlanChangeDirection("free", "pro"), "upgrade");
  assert.equal(getPlanChangeDirection("starter", "pro"), "upgrade");
  assert.equal(getPlanChangeDirection("pro", "starter"), "downgrade");
  assert.equal(getPlanChangeDirection("starter", "free"), "downgrade");
  assert.equal(getPlanChangeDirection("starter", "starter"), "same");
});

test("Free cannot remove branding while paid plans can", () => {
  assert.equal(canRemoveBrandingOnPlan("free"), false);
  assert.equal(canRemoveBrandingOnPlan("starter"), true);
  assert.equal(canRemoveBrandingOnPlan("pro"), true);
});

test("analytics access follows paid plan gates", () => {
  assert.equal(canAccessAnalyticsOnPlan("free"), false);
  assert.equal(canAccessAnalyticsOnPlan("starter"), true);
  assert.equal(canAccessAnalyticsOnPlan("pro"), true);
});

test("calculateUsagePercentage handles edge cases without NaN", () => {
  assert.equal(calculateUsagePercentage(0, 100), 0);
  assert.equal(calculateUsagePercentage(1, 4), 25);
  assert.equal(calculateUsagePercentage(1, 3), 33);
  assert.equal(calculateUsagePercentage(2, 3), 67);
  assert.equal(calculateUsagePercentage(999, 100), 100);
  assert.equal(calculateUsagePercentage(-5, 100), 0);
  assert.equal(calculateUsagePercentage(1, 0), 0);
  assert.equal(calculateUsagePercentage(1, -10), 0);
});

test("plan gates enforce chatbot count boundaries", () => {
  assert.equal(canCreateChatbotOnPlan("free", 0), true);
  assert.equal(canCreateChatbotOnPlan("free", 1), false);
  assert.equal(canCreateChatbotOnPlan("starter", 2), true);
  assert.equal(canCreateChatbotOnPlan("starter", 3), false);
  assert.equal(canCreateChatbotOnPlan("pro", 9), true);
  assert.equal(canCreateChatbotOnPlan("pro", 10), false);
});

test("plan gates enforce document count and file size boundaries", () => {
  assert.deepEqual(canUploadDocumentOnPlan("free", 4, 2 * 1024 * 1024), {
    ok: true,
  });
  assert.deepEqual(canUploadDocumentOnPlan("free", 5, 1), {
    ok: false,
    code: "DOCUMENT_LIMIT_REACHED",
  });
  assert.deepEqual(canUploadDocumentOnPlan("free", 0, 2 * 1024 * 1024 + 1), {
    ok: false,
    code: "FILE_TOO_LARGE",
  });
  assert.deepEqual(canUploadDocumentOnPlan("starter", 49, 10 * 1024 * 1024), {
    ok: true,
  });
  assert.deepEqual(canUploadDocumentOnPlan("pro", 199, 20 * 1024 * 1024), {
    ok: true,
  });
});

test("plan gates enforce monthly message boundaries", () => {
  assert.equal(canSendMessageOnPlan("free", 99), true);
  assert.equal(canSendMessageOnPlan("free", 100), false);
  assert.equal(canSendMessageOnPlan("starter", 1999), true);
  assert.equal(canSendMessageOnPlan("starter", 2000), false);
  assert.equal(canSendMessageOnPlan("pro", 9999), true);
  assert.equal(canSendMessageOnPlan("pro", 10000), false);
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
