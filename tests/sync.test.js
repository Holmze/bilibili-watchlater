import assert from "node:assert/strict";
import test from "node:test";

import { countByStatus, filterRecent } from "../src/sync.js";

test("countByStatus groups statuses", () => {
  assert.deepEqual(
    countByStatus([
      { status: "added" },
      { status: "added" },
      { status: "failed" }
    ]),
    { added: 2, failed: 1 }
  );
});

test("filterRecent respects maxAgeHours", () => {
  const now = Math.floor(Date.now() / 1000);
  const videos = [
    { aid: 1, created: now - 60 },
    { aid: 2, created: now - 72 * 60 * 60 }
  ];

  assert.deepEqual(filterRecent(videos, 2).map((video) => video.aid), [1]);
});
