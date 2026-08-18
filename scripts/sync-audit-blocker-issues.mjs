import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validatePublicAuditDashboard } from "../automation/src/public-audit-dashboard.js";
import { synchronizeAuditBlockerIssues } from "../automation/src/sync-audit-blocker-issues.js";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export async function main({ env = process.env, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  const repository = env.GITHUB_REPOSITORY;
  const credential = env.GITHUB_TOKEN;
  if (typeof repository !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) {
    throw new Error("GITHUB_REPOSITORY must be owner/repository");
  }
  if (typeof credential !== "string" || !credential.trim()) throw new Error("GITHUB_TOKEN is required");
  const publicDirectory = env.PUBLIC_DIRECTORY || resolve(repositoryRoot, "public");
  const dashboardBytes = await readFile(join(publicDirectory, "edge/audit/dashboard.json"));
  let dashboard;
  try { dashboard = JSON.parse(dashboardBytes.toString("utf8")); } catch { throw new Error("Public audit dashboard is invalid JSON"); }
  validatePublicAuditDashboard(dashboard);
  const [owner, repo] = repository.split("/", 2);
  const result = await synchronizeAuditBlockerIssues({
    owner,
    repo,
    ["token"]: credential,
    blockers: dashboard.blockers.filter(({ severity }) => severity === "blocker"),
    fetchImpl,
    now,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
