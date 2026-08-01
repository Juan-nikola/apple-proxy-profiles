import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

for (const platform of ["macos", "iphone", "ipad"]) {
  test(`${platform} example contains the layered continent selectors`, async () => {
    const profile = await readFile(new URL(`../examples/shadowrocket-${platform}.conf`, import.meta.url), "utf8");
    assert.match(profile, /^🌎 美洲 = select,/m);
    assert.match(profile, /^🚀 节点选择 = select,PROXY$/m);
    assert.match(profile, /^🤖 AI 专用 = select,🤖 AI 亚太,🤖 AI 欧洲,🤖 AI 美洲,include-all-proxies=true,policy-regex-filter=\^\.\+\$$/m);
    assert.match(profile, /^🤖 AI 亚太 = select,.*include-all-proxies=true,.*hidden=1$/m);
    assert.match(profile, /^🐙 GitHub = select,🚀 节点选择,⚡ 全部自动,🛟 全部故障转移,🌏 亚太,🌍 欧洲,🌎 美洲,DIRECT,include-all-proxies=true,policy-regex-filter=\^\.\+\$$/m);
    assert.doesNotMatch(profile, /,use=true/);
    assert.match(profile, /ByteDance\/ByteDance\.list,🎵 抖音/);
    assert.match(profile, /^DOMAIN-SET,.*ChinaMax_Domain\.list,DIRECT,/m);
    assert.match(profile, /^DOMAIN-SUFFIX,leiting\.com,DIRECT$/m);
    assert.match(profile, /^block-quic = all-proxy$/m);
    assert.match(profile, new RegExp(`^ipv6 = ${platform === "macos" ? "false" : "true"}$`, "m"));
  });
}
