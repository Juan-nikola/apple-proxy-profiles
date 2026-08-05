import assert from "node:assert/strict";
import test from "node:test";

import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../shared/rules/domestic-fallback.js";

test("keeps a deterministic local safety net for domestic app domains", () => {
  assert.deepEqual(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES, [
    "cn",
    "bilibili.com",
    "bilivideo.com",
    "biliapi.com",
    "hdslb.com",
    "douyin.com",
    "douyincdn.com",
    "byteimg.com",
    "ibytedtos.com",
    "pstatp.com",
    "snssdk.com",
    "amemv.com",
    "ixigua.com",
    "toutiao.com",
    "toutiaoimg.com",
    "xiaohongshu.com",
    "xhscdn.com",
    "weibo.com",
  ]);
  assert.equal(new Set(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES).size, DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length);
  assert.equal(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.every((value) => (
    value === "cn" || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u.test(value)
  )), true);
});
