import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSettings } from "../src/storage.js";

test("normalizeSettings keeps empty owner list empty", () => {
  const settings = normalizeSettings({ owners: [] });

  assert.deepEqual(settings.owners, []);
});

test("normalizeSettings preserves owner profile fields", () => {
  const settings = normalizeSettings({
    owners: [
      {
        mid: 1,
        name: "owner",
        avatarUrl: "https://example.com/avatar.jpg",
        spaceUrl: "https://space.bilibili.com/1",
        profileFetchedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  });

  assert.equal(settings.owners[0].avatarUrl, "https://example.com/avatar.jpg");
  assert.equal(settings.owners[0].spaceUrl, "https://space.bilibili.com/1");
  assert.equal(settings.owners[0].profileFetchedAt, "2026-01-01T00:00:00.000Z");
});

test("normalizeSettings clamps numeric settings", () => {
  const settings = normalizeSettings({
    pageSize: 999,
    alarmPeriodMinutes: 0,
    addIntervalSeconds: 999,
    fetchRetryCount: 999
  });

  assert.equal(settings.pageSize, 50);
  assert.equal(settings.alarmPeriodMinutes, 30);
  assert.equal(settings.addIntervalSeconds, 60);
  assert.equal(settings.fetchRetryCount, 5);
});
