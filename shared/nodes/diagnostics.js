export function createDiagnostics() {
  return {
    total: 0,
    accepted: 0,
    protocol: {},
    source: {},
    region: {},
    excluded: {},
    warnings: {},
  };
}

export function createClientFilterDiagnostics() {
  return {
    accepted: 0,
    excluded: {},
  };
}

export function increment(bucket, key, amount = 1) {
  const current = Object.hasOwn(bucket, key) ? bucket[key] : 0;
  Object.defineProperty(bucket, key, {
    value: current + amount,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
