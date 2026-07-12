import test from "node:test";
import assert from "node:assert/strict";
import { getSafeNextPath } from "./utils";

test("getSafeNextPath accepts internal app paths", () => {
  assert.equal(getSafeNextPath("/app"), "/app");
  assert.equal(getSafeNextPath("/app/chatbots?id=123"), "/app/chatbots?id=123");
});

test("getSafeNextPath rejects unsafe redirect targets", () => {
  assert.equal(getSafeNextPath("https://example.com"), null);
  assert.equal(getSafeNextPath("//example.com"), null);
  assert.equal(getSafeNextPath("/\\evil"), null);
  assert.equal(getSafeNextPath("/app\nmalicious"), null);
});
