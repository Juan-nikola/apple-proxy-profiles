import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function collectJsonFiles(root, current = "") {
  const files = [];
  for (const entry of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    const absolute = join(root, relative);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(root, relative));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(absolute);
    }
  }
  return files;
}

function canonicalJson(text, file) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`INCY JSON file is invalid: ${file}`);
  }
  const canonical = `${JSON.stringify(parsed, null, 2)}\n`;
  if (canonical !== text) {
    throw new Error(`INCY JSON file is not canonical: ${file}`);
  }
}

export async function checkJsonTree(paths = []) {
  const files = [];
  for (const path of paths) {
    const resolved = resolve(path);
    const info = await stat(resolved);
    if (info.isDirectory()) files.push(...await collectJsonFiles(resolved));
    else if (info.isFile() && resolved.endsWith(".json")) files.push(resolved);
  }
  files.sort();
  for (const file of files) {
    canonicalJson(await readFile(file, "utf8"), file);
  }
  return files;
}

async function main() {
  const root = resolve(import.meta.dirname, "..");
  const files = await checkJsonTree([
    join(root, "examples"),
    join(root, "../../public/current/incy"),
  ]);
  console.log(`OK ${files.length} JSON files validated`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
