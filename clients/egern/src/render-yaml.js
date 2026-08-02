const INDENT_WIDTH = 2;
const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const YAML_BOOLEAN_OR_NULL = /^(?:false|null|true)$/i;

function displayPath(path) {
  return path || "<root>";
}

function propertyPath(path, key) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return path ? `${path}.${key}` : key;
  }

  return `${path}[${JSON.stringify(key)}]`;
}

function indexPath(path, index) {
  return `${path}[${index}]`;
}

function renderKey(key) {
  if (PLAIN_KEY.test(key) && !YAML_BOOLEAN_OR_NULL.test(key)) {
    return key;
  }

  return JSON.stringify(key);
}

function scalarText(value, path) {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError(`Expected finite number at ${displayPath(path)}`);
      }
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw new TypeError(`Unsupported YAML value at ${displayPath(path)}`);
    default:
      return null;
  }
}

function isEmptyCollection(value) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return Reflect.ownKeys(value).length === 0;
}

function emptyCollectionText(value) {
  return Array.isArray(value) ? "[]" : "{}";
}

function inspectArray(value, path) {
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (typeof key === "symbol") {
      throw new TypeError(`Symbol key at ${displayPath(path)}`);
    }

    if (key === "length") {
      continue;
    }

    const index = Number(key);
    const canonicalIndex = Number.isInteger(index)
      && index >= 0
      && index < value.length
      && String(index) === key;
    if (!canonicalIndex) {
      throw new TypeError(`Unsupported YAML array property at ${propertyPath(path, key)}`);
    }
  }

  const descriptors = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    const itemPath = indexPath(path, index);
    if (!descriptor) {
      throw new TypeError(`Sparse YAML array at ${displayPath(itemPath)}`);
    }
    if ("get" in descriptor || "set" in descriptor) {
      throw new TypeError(`Accessor property at ${displayPath(itemPath)}`);
    }
    descriptors.push(descriptor);
  }

  return descriptors;
}

function inspectObject(value, path) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Expected plain object or array at ${displayPath(path)}`);
  }

  const descriptors = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      throw new TypeError(`Symbol key at ${displayPath(path)}`);
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    const childPath = propertyPath(path, key);
    if ("get" in descriptor || "set" in descriptor) {
      throw new TypeError(`Accessor property at ${displayPath(childPath)}`);
    }
    if (!descriptor.enumerable) {
      throw new TypeError(`Non-enumerable property at ${displayPath(childPath)}`);
    }
    descriptors.push([key, descriptor]);
  }

  return descriptors;
}

function renderNode(value, path, indent, active) {
  const scalar = scalarText(value, path);
  if (scalar !== null) {
    return [" ".repeat(indent) + scalar];
  }

  if (typeof value !== "object") {
    throw new TypeError(`Unsupported YAML value at ${displayPath(path)}`);
  }
  if (active.has(value)) {
    throw new TypeError(`Cyclic YAML value at ${displayPath(path)}`);
  }

  active.add(value);
  try {
    if (Array.isArray(value)) {
      const descriptors = inspectArray(value, path);
      if (descriptors.length === 0) {
        return [" ".repeat(indent) + "[]"];
      }

      const lines = [];
      for (let index = 0; index < descriptors.length; index += 1) {
        const item = descriptors[index].value;
        const itemPath = indexPath(path, index);
        const itemScalar = scalarText(item, itemPath);
        if (itemScalar !== null) {
          lines.push(`${" ".repeat(indent)}- ${itemScalar}`);
          continue;
        }

        const itemLines = renderNode(item, itemPath, indent + INDENT_WIDTH, active);
        if (isEmptyCollection(item)) {
          lines.push(`${" ".repeat(indent)}- ${emptyCollectionText(item)}`);
        } else if (Array.isArray(item)) {
          lines.push(`${" ".repeat(indent)}-`, ...itemLines);
        } else {
          const itemIndent = " ".repeat(indent + INDENT_WIDTH);
          lines.push(
            `${" ".repeat(indent)}- ${itemLines[0].slice(itemIndent.length)}`,
            ...itemLines.slice(1),
          );
        }
      }
      return lines;
    }

    const descriptors = inspectObject(value, path);
    if (descriptors.length === 0) {
      return [" ".repeat(indent) + "{}"];
    }

    const lines = [];
    for (const [key, descriptor] of descriptors) {
      const child = descriptor.value;
      const childPath = propertyPath(path, key);
      const childScalar = scalarText(child, childPath);
      const prefix = `${" ".repeat(indent)}${renderKey(key)}:`;
      if (childScalar !== null) {
        lines.push(`${prefix} ${childScalar}`);
        continue;
      }

      const childLines = renderNode(
        child,
        childPath,
        indent + INDENT_WIDTH,
        active,
      );
      if (isEmptyCollection(child)) {
        lines.push(`${prefix} ${emptyCollectionText(child)}`);
      } else {
        lines.push(prefix, ...childLines);
      }
    }
    return lines;
  } finally {
    active.delete(value);
  }
}

export function renderYaml(value) {
  return `${renderNode(value, "", 0, new WeakSet()).join("\n")}\n`;
}
