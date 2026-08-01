import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolve } from "node:path";

import { scanFiles } from "../shared/security/secret-scan.js";

export {
  containsSecret,
  sanitizeSyntheticPlaceholders,
  scanFiles,
} from "../shared/security/secret-scan.js";

const execFileAsync = promisify(execFile);

async function main() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-co", "--exclude-standard"]);
  const files = stdout.split("\n").filter((file) => file && file !== "package-lock.json");
  const findings = await scanFiles(files);

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
