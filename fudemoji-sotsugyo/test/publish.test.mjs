import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublished, parseNow } from "../src/publish.mjs";

const PUBLISH_AT = "2026-12-01T00:00:00+09:00";

test("公開時刻（JST）より前は未公開", () => {
  assert.equal(isPublished(PUBLISH_AT, new Date("2026-11-30T23:59:59+09:00")), false);
});

test("公開時刻ちょうど以降は公開", () => {
  assert.equal(isPublished(PUBLISH_AT, new Date("2026-12-01T00:00:00+09:00")), true);
  assert.equal(isPublished(PUBLISH_AT, new Date("2026-11-30T15:00:00Z")), true);
});

test("parseNow は --now の文字列を Date にし、未指定なら現在時刻", () => {
  assert.equal(parseNow("2026-12-01T00:05:00+09:00").toISOString(), "2026-11-30T15:05:00.000Z");
  assert.ok(Math.abs(parseNow(undefined).getTime() - Date.now()) < 1000);
  assert.throws(() => parseNow("not a date"), /now/);
});
