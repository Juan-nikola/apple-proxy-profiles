#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  encodePolicyOverrides,
  policyOverrideParam,
  updateTaskPolicy,
} from "../src/policy-sync.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const defaultPrivateDir = resolve(repoRoot, "../onexray-private");

function argument(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
}

async function loadEnvFile(envPath) {
  try {
    const text = await readFile(envPath, "utf8");
    const entries = {};
    for (const line of text.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equal = trimmed.indexOf("=");
      if (equal <= 0) continue;
      entries[trimmed.slice(0, equal).trim()] = trimmed.slice(equal + 1).trim();
    }
    return entries;
  } catch {
    return {};
  }
}

async function request(apiBase, path, init) {
  const response = await fetch(`${apiBase}${path}`, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Sub-Store ${path} -> ${response.status}: ${text.slice(0, 200)}`);
  }
  return text;
}

async function main(args = process.argv.slice(2)) {
  const printOnly = args.includes("--print");
  const policyFile = resolve(argument(args, "--policy-file", resolve(defaultPrivateDir, "policy.json")));
  const envFile = resolve(argument(args, "--env-file", resolve(defaultPrivateDir, "substore.env")));
  const linkFile = resolve(argument(args, "--save-link", resolve(defaultPrivateDir, "onexray-profile-link.txt")));
  const apiBase = process.env.SUBSTORE_API
    ?? (await loadEnvFile(envFile)).SUBSTORE_API
    ?? "";
  if (!apiBase) {
    throw new Error(
      "SUBSTORE_API 未设置：请把 Sub-Store API 地址写入 " + envFile + " 或设置环境变量",
    );
  }

  let policy;
  try {
    policy = JSON.parse(await readFile(policyFile, "utf8"));
  } catch (error) {
    throw new Error(`无法读取 policy 文件 ${policyFile}: ${error.message}`);
  }
  const encoded = encodePolicyOverrides(policy);
  const param = policyOverrideParam(encoded);

  if (printOnly) {
    process.stdout.write(`${param}\n`);
    return;
  }

  for (const taskName of ["onexray-profile", "onexray-routing-audit"]) {
    const whole = JSON.parse(
      await request(apiBase, `/api/wholeFile/${encodeURIComponent(taskName)}`),
    ).data;
    const updated = updateTaskPolicy(whole, encoded);
    await request(apiBase, `/api/file/${encodeURIComponent(taskName)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updated),
    });
    process.stdout.write(`updated ${taskName}\n`);
  }

  const profileLink = (await request(apiBase, "/api/file/onexray-profile")).trim();
  if (!profileLink.startsWith("onexray://onexray.com/config/add?type=profile&data=")) {
    throw new Error("onexray-profile 生成结果不是有效的 deep link");
  }
  await request(apiBase, "/api/file/onexray-routing-audit");
  await mkdir(dirname(linkFile), { recursive: true });
  await writeFile(linkFile, `${profileLink}\n`);

  const fragment = profileLink.split("#").at(-1);
  process.stdout.write(
    `policyOverrides ${encoded.length} chars -> ${policyFile}\n` +
    `new profile link saved -> ${linkFile}\n` +
    `fragment: ${fragment}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
