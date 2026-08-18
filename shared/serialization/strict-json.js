const DEFAULT_MAX_BYTES = 1 * 1024 * 1024;
const DEFAULT_MAX_DEPTH = 32;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const WHITESPACE = new Set([" ", "\t", "\r", "\n"]);

function failure(label, reason) {
  const prefix = typeof label === "string" && label.length > 0 ? `${label}: ` : "";
  return new SyntaxError(`${prefix}${reason}`);
}

function asText(value, label) {
  if (typeof value === "string") {
    // TextEncoder replaces lone surrogates. Reject those replacements up front
    // so callers get fatal UTF-8 semantics for text supplied as a JS string.
    if (/[\uD800-\uDFFF]/u.test(value.replace(/[\uD800-\uDBFF](?=[\uDC00-\uDFFF])/gu, "").replace(/(?<=[\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, ""))) {
      throw failure(label, "invalid UTF-8 text");
    }
    return { text: value, bytes: new TextEncoder().encode(value).byteLength };
  }
  if (value instanceof Uint8Array) {
    try {
      return { text: new TextDecoder("utf-8", { fatal: true }).decode(value), bytes: value.byteLength };
    } catch {
      throw failure(label, "invalid UTF-8 text");
    }
  }
  throw failure(label, "input must be UTF-8 text");
}

function validateOptions(options, label) {
  const { maxBytes = DEFAULT_MAX_BYTES, maxDepth = DEFAULT_MAX_DEPTH } = options ?? {};
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw failure(label, "maxBytes must be a non-negative integer");
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) throw failure(label, "maxDepth must be a non-negative integer");
  return { maxBytes, maxDepth };
}

function validateAndParse(text, { label, maxDepth }) {
  let index = 0;
  const length = text.length;
  const error = (reason) => { throw failure(label, reason); };
  const skipWhitespace = () => {
    while (index < length && WHITESPACE.has(text[index])) index += 1;
  };
  const parseString = () => {
    if (text[index] !== '"') error("invalid JSON");
    const start = index;
    index += 1;
    while (index < length) {
      const character = text[index++];
      if (character === '"') {
        try {
          return JSON.parse(text.slice(start, index));
        } catch {
          error("invalid JSON");
        }
      }
      if (character === "\\") {
        const escape = text[index++];
        if (escape === "u") {
          if (!/^[0-9a-f]{4}$/iu.test(text.slice(index, index + 4))) error("invalid JSON");
          index += 4;
        } else if (!'"\\/bfnrt'.includes(escape)) {
          error("invalid JSON");
        }
      } else if (character < " ") {
        error("invalid JSON");
      }
    }
    error("invalid JSON");
  };
  const parseNumber = () => {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(text.slice(index));
    if (!match) error("invalid JSON");
    index += match[0].length;
  };
  const parseValue = (depth) => {
    skipWhitespace();
    const character = text[index];
    if (character === "{" || character === "[") {
      if (depth > maxDepth) error("maximum JSON depth exceeded");
      const object = character === "{";
      index += 1;
      skipWhitespace();
      if (text[index] === (object ? "}" : "]")) {
        index += 1;
        return;
      }
      const keys = object ? new Set() : null;
      while (index < length) {
        skipWhitespace();
        if (object) {
          const key = parseString();
          if (keys.has(key)) error("duplicate JSON key");
          if (FORBIDDEN_KEYS.has(key)) error("unsupported prototype key");
          keys.add(key);
          skipWhitespace();
          if (text[index++] !== ":") error("invalid JSON");
        }
        parseValue(depth + 1);
        skipWhitespace();
        const close = object ? "}" : "]";
        if (text[index] === close) {
          index += 1;
          return;
        }
        if (text[index++] !== ",") error("invalid JSON");
      }
      error("invalid JSON");
    }
    if (character === '"') {
      parseString();
      return;
    }
    if (text.startsWith("true", index) || text.startsWith("false", index) || text.startsWith("null", index)) {
      index += text.startsWith("true", index) ? 4 : text.startsWith("false", index) ? 5 : 4;
      return;
    }
    parseNumber();
  };

  skipWhitespace();
  parseValue(1);
  skipWhitespace();
  if (index !== length) error("invalid JSON");
  try {
    return JSON.parse(text);
  } catch {
    error("invalid JSON");
  }
}

export function parseStrictJson(value, options = {}) {
  const label = options?.label;
  const { maxBytes, maxDepth } = validateOptions(options, label);
  const { text, bytes } = asText(value, label);
  if (bytes > maxBytes) throw failure(label, "JSON exceeds byte limit");
  return validateAndParse(text, { label, maxDepth });
}

export const STRICT_JSON_DEFAULTS = Object.freeze({
  maxBytes: DEFAULT_MAX_BYTES,
  maxDepth: DEFAULT_MAX_DEPTH,
});
