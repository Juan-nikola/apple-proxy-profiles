import assert from "node:assert/strict";
import test from "node:test";

import {
  CRITICAL_DOMESTIC_DOMAIN_SUFFIXES,
  CRITICAL_DOMESTIC_RULES,
} from "../shared/rules/critical-domestic.js";

test("critical domestic safety net covers Baidu cloud download endpoints", () => {
  assert.deepEqual(CRITICAL_DOMESTIC_DOMAIN_SUFFIXES, [
    "baidupcs.com",
    "baidupcs.net",
    "baiduyun.com",
    "baiduyuncdn.com",
    "baidubce.com",
    "bcebos.com",
    "bdstatic.com",
  ]);
  assert.deepEqual(CRITICAL_DOMESTIC_RULES, [
    "DOMAIN-SUFFIX,baidupcs.com",
    "DOMAIN-SUFFIX,baidupcs.net",
    "DOMAIN-SUFFIX,baiduyun.com",
    "DOMAIN-SUFFIX,baiduyuncdn.com",
    "DOMAIN-SUFFIX,baidubce.com",
    "DOMAIN-SUFFIX,bcebos.com",
    "DOMAIN-SUFFIX,bdstatic.com",
  ]);
});
