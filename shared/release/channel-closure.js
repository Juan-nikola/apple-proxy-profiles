import { FRONTIER_CHANNELS } from "./frontier-manifest.js";

const CHANNEL_SET = new Set(FRONTIER_CHANNELS);
const CHANNEL_PATH_LOOSE = /(?:^|[\s/"'`])(current)(?=\/)/giu;
const CHANNEL_FIELD = /\bchannel\s*(?:=|:)\s*["']?\s*(current)\b/giu;
const VERSION_PATH = /(?:^|[\s/"'`])versions\/([0-9a-f]{64})(?=\/)/giu;

function closureError(reason) {
  return new Error(`Channel closure violation: ${reason}`);
}

function decodeText(value) {
  if (typeof value === "string") return value;
  if (!(value instanceof Uint8Array)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    return null;
  }
}

function decodedOnce(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function addReference(references, path, actualChannel, offset, kind) {
  references.push({ path, actualChannel, offset, kind });
}

// Sub-Store generator bundles intentionally contain a channel enum with a
// default (`edge`) and validation tables for all three channels. Those
// literals are executable policy input, not publication URLs; only concrete
// channel-scoped paths/fields should participate in closure validation.
function isNativeGeneratorPath(path) {
  return /^(?:(?:edge|current|previous)\/|versions\/[0-9a-f]{64}\/)?(?:clients\/[^/]+\/[0-9a-f]{64}\/)?(?:anywhere|egern|shadowrocket|sing-box|surge|v2box|v2rayn|clash|happ|incy)\/scripts\/[^/]+\.js$/u.test(path);
}

function scanText(path, text) {
  const references = [];
  const decoded = decodedOnce(text);
  for (const source of [text, decoded]) {
    let match;
    if (!isNativeGeneratorPath(path)) {
      CHANNEL_FIELD.lastIndex = 0;
      while ((match = CHANNEL_FIELD.exec(source)) !== null) {
        addReference(references, path, match[1].toLowerCase(), match.index, "field");
      }
    }
    CHANNEL_PATH_LOOSE.lastIndex = 0;
    while ((match = CHANNEL_PATH_LOOSE.exec(source)) !== null) {
      addReference(references, path, match[1].toLowerCase(), match.index, "path");
    }
  }
  return references;
}

function scanVersionReferences(path, text, immutableVersion) {
  if (!immutableVersion) return [];
  const references = [];
  const decoded = decodedOnce(text);
  for (const source of [text, decoded]) {
    VERSION_PATH.lastIndex = 0;
    let match;
    while ((match = VERSION_PATH.exec(source)) !== null) {
      if (match[1].toLowerCase() !== immutableVersion.toLowerCase()) {
        references.push({
          path,
          actualChannel: `versions/${match[1].toLowerCase()}`,
          offset: match.index,
          kind: "immutable-version",
        });
      }
    }
  }
  return references;
}

export function findChannelClosureViolations({
  files,
  channel,
  rootPrefix = null,
  immutableVersion = null,
} = {}) {
  if (!CHANNEL_SET.has(channel)) throw closureError("unsupported expected channel");
  if (!(files instanceof Map)) throw closureError("files must be a Map");
  if (immutableVersion !== null && !/^[0-9a-f]{64}$/iu.test(immutableVersion)) {
    throw closureError("immutable version must be a SHA-256 hash");
  }
  const violations = [];
  const entries = [...files.entries()]
    .filter(([path]) => typeof path === "string")
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [path, value] of entries) {
    const text = decodeText(value);
    if (text === null) continue;
    const refs = [
      ...scanText(path, text),
      ...scanVersionReferences(path, text, immutableVersion),
    ];
    const seen = new Set();
    for (const reference of refs) {
      const referenceKey = `${reference.path}\u0000${reference.actualChannel}\u0000${reference.offset}\u0000${reference.kind}`;
      if (seen.has(referenceKey)) continue;
      seen.add(referenceKey);
      if (reference.kind === "immutable-version") {
        violations.push({ ...reference, expectedChannel: rootPrefix ?? `versions/${immutableVersion}` });
      } else if (reference.actualChannel !== channel) {
        violations.push({ ...reference, expectedChannel: channel });
      }
    }
  }
  violations.sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.offset - right.offset
    || left.actualChannel.localeCompare(right.actualChannel)
  ));
  return Object.freeze(violations.map((violation) => Object.freeze(violation)));
}

export function assertChannelClosure(input) {
  const violations = findChannelClosureViolations(input);
  if (violations.length === 0) return true;
  const first = violations[0];
  throw closureError(`${first.path} references ${first.actualChannel}; expected ${first.expectedChannel}`);
}
