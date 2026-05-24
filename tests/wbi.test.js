import assert from "node:assert/strict";
import test from "node:test";

import { getMixinKey, signWbiParams } from "../src/wbi.js";

test("getMixinKey returns expected 32-char mixin key", () => {
  assert.equal(
    getMixinKey("7cd084941338484aae1ad9425b84077c", "4932caff0ff746eab6f01bf08b70ac45"),
    "ea1db124af3c7062474693fa704f4ff8"
  );
});

test("signWbiParams adds expected signature", async () => {
  const signed = await signWbiParams(
    { mid: 1, ps: 10 },
    "7cd084941338484aae1ad9425b84077c",
    "4932caff0ff746eab6f01bf08b70ac45",
    1700000000
  );

  assert.equal(signed.w_rid, "7be8078d0046554890d487ede07159d6");
});
