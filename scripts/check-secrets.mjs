import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolve } from "node:path";

import { scanRepositoryFiles } from "../shared/security/secret-scan.js";

export {
  containsSecret,
  sanitizeSyntheticPlaceholders,
  scanFiles,
} from "../shared/security/secret-scan.js";

const execFileAsync = promisify(execFile);

export async function listRepositoryFiles(cwd = process.cwd()) {
  const { stdout: rootOutput } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    maxBuffer: 16 * 1024 * 1024,
  });
  const repositoryRoot = rootOutput.trim();
  const { stdout } = await execFileAsync("git", ["-C", repositoryRoot, "ls-files", "-co", "--exclude-standard", "-z"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  const files = stdout.split("\0").filter(Boolean);
  const existingFiles = (await Promise.all(files.map(async (file) => {
    try {
      await access(resolve(repositoryRoot, file));
      return file;
    } catch {
      return null;
    }
  }))).filter(Boolean);
  return {
    repositoryRoot,
    files: existingFiles,
  };
}

export async function main({ cwd = process.cwd() } = {}) {
  const { repositoryRoot, files } = await listRepositoryFiles(cwd);
  const findings = await scanRepositoryFiles(repositoryRoot, files);

  if (findings.length > 0) {
    for (const finding of findings) console.error(`SECRET ${finding.file} ${finding.ruleId}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${files.length} files scanned; no secrets found`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
