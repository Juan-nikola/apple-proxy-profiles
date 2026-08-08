import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ACTION_PINS = Object.freeze({
  "actions/checkout": "3d3c42e5aac5ba805825da76410c181273ba90b1",
  "actions/setup-node": "820762786026740c76f36085b0efc47a31fe5020",
  "actions/configure-pages": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
  "actions/upload-pages-artifact": "fc324d3547104276b827a68afc52ff2a11cc49c9",
  "actions/deploy-pages": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
});

const SHA_PIN = /^[0-9a-f]{40}$/;

export const PUBLIC_PAGES_LIMITS = Object.freeze({
  githubMaxBytes: 1024 * 1024 * 1024,
  maxBytes: 750 * 1024 * 1024,
  maxVersions: 9,
});

function workflowUses(text) {
  return [...text.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)\s*(?:#.*)?$/gmu)].map((match) => match[1]);
}

function artifactPaths(text) {
  const lines = text.split(/\r?\n/u);
  const paths = [];

  for (let index = 0; index < lines.length; index += 1) {
    const useMatch = lines[index].match(/^(\s*)(?:-\s*)?uses:\s*([^\s#]+)/u);
    if (!useMatch || !/^actions\/upload-(?:pages-)?artifact@/u.test(useMatch[2])) continue;

    const stepIndent = useMatch[1].length;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() === "") continue;
      const indent = line.match(/^\s*/u)[0].length;
      if (indent < stepIndent || (indent === stepIndent && /^\s*-\s+/u.test(line))) break;
      const pathMatch = line.match(/^\s*path:\s*(.*?)\s*(?:#.*)?$/u);
      if (pathMatch) paths.push(pathMatch[1].replace(/^['"]|['"]$/gu, ""));
    }
  }

  return paths;
}

function permissionValue(text, permission) {
  return [...text.matchAll(new RegExp(`^\\s*${permission}:\\s*([^\\s#]+)`, "gmu"))]
    .map((match) => match[1]);
}

function commandPosition(text, command) {
  return text.indexOf(`run: ${command}`);
}

function validateOfficialCoreGate(file, text, beforePosition, channel) {
  const commands = [
    "node scripts/install-sing-box-core.mjs",
    `node scripts/stage-rule-artifacts.mjs --channel ${channel}`,
    "npm --workspace @apple-proxy-profiles/sing-box run compile:rules",
    "npm --workspace @apple-proxy-profiles/sing-box run check:config",
    "npm run verify:lightweight",
  ];
  const positions = commands.map((command) => commandPosition(text, command));
  if (positions.some((position) => position === -1)
    || positions.some((position, index) => index > 0 && position <= positions[index - 1])
    || beforePosition === -1
    || positions.at(-1) >= beforePosition) {
    return [`${file}: official sing-box compiler gate is missing or not closed in order`];
  }
  return [];
}

export function validateWorkflowText(file, text) {
  const errors = [];
  if (/^\s*pull_request_target\s*:/mu.test(text)) {
    errors.push(`${file}: pull_request_target is forbidden`);
  }

  for (const reference of workflowUses(text)) {
    const splitAt = reference.lastIndexOf("@");
    const action = splitAt === -1 ? reference : reference.slice(0, splitAt);
    const pin = splitAt === -1 ? "" : reference.slice(splitAt + 1);
    if (!SHA_PIN.test(pin)) {
      errors.push(`${file}: action is not pinned to a 40-character SHA: ${action}`);
      continue;
    }
    if (Object.hasOwn(ACTION_PINS, action) && ACTION_PINS[action] !== pin) {
      errors.push(`${file}: unexpected pin for ${action}`);
    }
  }

  for (const path of artifactPaths(text)) {
    const normalized = path.replace(/\/+$/u, "");
    if (["", ".", "${{ github.workspace }}"].includes(normalized)
      || /^[>|]/u.test(path)
      || normalized === ".git"
      || normalized.startsWith(".git/")
      || normalized.endsWith("/.git")
      || normalized.includes("/.git/")) {
      errors.push(`${file}: unsafe artifact path: ${path || "<empty>"}`);
    }
  }

  if (/^\s*permissions:\s*write-all\s*$/mu.test(text)) {
    errors.push(`${file}: permissions: write-all is forbidden`);
  }

  if (file.endsWith("update-rules.yml")) {
    if (!permissionValue(text, "contents").includes("write")) {
      errors.push(`${file}: update job requires contents: write`);
    }
    if (permissionValue(text, "pages").length > 0 || permissionValue(text, "id-token").length > 0) {
      errors.push(`${file}: update workflow must not request Pages permissions`);
    }
    if (/^\s*push:\s*$/mu.test(text)) {
      errors.push(`${file}: update workflow must not trigger on its own push`);
    }
    if (!/github\.event_name == 'schedule' \|\| github\.ref == 'refs\/heads\/main'/u.test(text)) {
      errors.push(`${file}: update job must restrict writes to scheduled or main-ref runs`);
    }
    const edgeCommand = "npm run update:rules";
    const edgeAt = commandPosition(text, edgeCommand);
    if (!/^\s*run:\s*npm run update:rules\s*$/mu.test(text)) {
      errors.push(`${file}: edge update must invoke the package script without duplicate arguments`);
    }
    errors.push(...validateOfficialCoreGate(file, text, edgeAt, "edge"));
    const orderedCommands = [
      "npm run verify",
      "git diff --exit-code -- . \":(exclude)public/**\"",
      edgeCommand,
      "npm run check:rules",
      "npm run check:secrets",
    ];
    const positions = orderedCommands.map((command) => commandPosition(text, command));
    if (positions.some((position) => position === -1)
      || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
      errors.push(`${file}: verification, clean-tree gate, update, rule check, and secret scan are not closed in order`);
    }
    if (!/^\s*client:\s*$/mu.test(text)
      || !/^\s*manifest_hash:\s*$/mu.test(text)
      || !/^\s*environment:\s*canary-approval\s*$/mu.test(text)
      || !/github\.event_name == 'workflow_dispatch'.*inputs\.client.*inputs\.manifest_hash/su.test(text)
      || !/npm run update:rules -- --promote "\$PROMOTION_CLIENT" "\$PROMOTION_MANIFEST_HASH"/u.test(text)) {
      errors.push(`${file}: current promotion must require canary approval and exact client manifest inputs`);
    }
    const edgeJobStart = text.indexOf("  build-edge:");
    const nextJobStart = text.indexOf("\n  promote-current:", edgeJobStart);
    const edgeJob = edgeJobStart === -1 ? "" : text.slice(edgeJobStart, nextJobStart === -1 ? undefined : nextJobStart);
    if (!edgeJob.includes("--channel edge") || edgeJob.includes("--promote")) {
      errors.push(`${file}: scheduled job must update edge only and never promote current`);
    }
  }

  if (file.endsWith("deploy-pages.yml")) {
    if (permissionValue(text, "contents").includes("write")) {
      errors.push(`${file}: deploy workflow must not request contents: write`);
    }
    if (!permissionValue(text, "pages").includes("write")
      || !permissionValue(text, "id-token").includes("write")) {
      errors.push(`${file}: deploy job requires pages: write and id-token: write`);
    }
    const paths = artifactPaths(text);
    if (paths.length !== 1 || paths[0] !== "public") {
      errors.push(`${file}: Pages artifact must contain only public`);
    }
    if (!/^\s*workflow_run:\s*$/mu.test(text)
      || !/^\s*-\s*Update Rules\s*$/mu.test(text)
      || !/workflow_run\.conclusion == 'success'/u.test(text)
      || !/^  workflow_run:\s*$[\s\S]*?^    branches:\s*$\n^      - main\s*$/mu.test(text)) {
      errors.push(`${file}: workflow_run must accept only successful Update Rules runs on main`);
    }
    if (text.includes("npm run update:rules") || /\bgit push\b/u.test(text)) {
      errors.push(`${file}: deploy workflow must not update or push repository content`);
    }
    const verifyAt = commandPosition(text, "npm run verify");
    const ruleCheckAt = commandPosition(text, "npm run check:rules");
    const uploadAt = text.indexOf("uses: actions/upload-pages-artifact@");
    errors.push(...validateOfficialCoreGate(file, text, ruleCheckAt, "current"));
    if (verifyAt === -1 || ruleCheckAt <= verifyAt || uploadAt <= ruleCheckAt) {
      errors.push(`${file}: deploy must verify and reproduce rules before uploading public`);
    }
  }

  return errors;
}

async function treeBytes(directory) {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) bytes += await treeBytes(child);
    else if (entry.isFile()) bytes += (await stat(child)).size;
    else throw new Error("public tree contains a non-regular entry");
  }
  return bytes;
}

export async function checkPublicPagesTree(repositoryRoot) {
  const rootPath = repositoryRoot instanceof URL ? fileURLToPath(repositoryRoot) : repositoryRoot;
  const publicDirectory = new URL("public/", pathToFileURL(`${resolve(rootPath)}/`));
  const versionsDirectory = new URL("versions/", publicDirectory);
  const errors = [];
  const bytes = await treeBytes(publicDirectory);
  const versions = await readdir(versionsDirectory, { withFileTypes: true });
  const validVersions = versions.filter((entry) => entry.isDirectory() && /^[0-9a-f]{64}$/u.test(entry.name));

  if (validVersions.length !== versions.length) {
    errors.push("public/versions contains an invalid entry");
  }
  if (validVersions.length > PUBLIC_PAGES_LIMITS.maxVersions) {
    errors.push(`public/versions exceeds ${PUBLIC_PAGES_LIMITS.maxVersions} retained versions`);
  }
  if (bytes > PUBLIC_PAGES_LIMITS.maxBytes) {
    errors.push(`public exceeds the ${PUBLIC_PAGES_LIMITS.maxBytes} byte deployment budget`);
  }

  return { bytes, errors, versionCount: validVersions.length };
}

export async function checkActions(repositoryRoot) {
  const rootPath = repositoryRoot instanceof URL ? fileURLToPath(repositoryRoot) : repositoryRoot;
  const workflowsDirectory = resolve(rootPath, ".github/workflows");
  const names = (await readdir(workflowsDirectory))
    .filter((name) => /\.ya?ml$/u.test(name))
    .sort();
  const errors = [];
  for (const name of names) {
    const absolute = resolve(workflowsDirectory, name);
    const file = relative(rootPath, absolute);
    errors.push(...validateWorkflowText(file, await readFile(absolute, "utf8")));
  }
  return { errors, workflowCount: names.length };
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const repositoryRoot = dirname(dirname(modulePath));
  try {
    const { errors, workflowCount } = await checkActions(repositoryRoot);
    const publicTree = await checkPublicPagesTree(repositoryRoot);
    const allErrors = [...errors, ...publicTree.errors];
    if (allErrors.length > 0) {
      process.stderr.write(`${allErrors.join("\n")}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(`OK ${workflowCount} workflows checked; ${publicTree.versionCount} versions and ${publicTree.bytes} public bytes are deployable\n`);
    }
  } catch (error) {
    process.stderr.write(`ACTION_CHECK_FAILED ${error.code ?? error.name}\n`);
    process.exitCode = 1;
  }
}
