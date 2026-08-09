export const OBSERVED_DOMESTIC_RECORDS = Object.freeze([
  Object.freeze({
    suffix: "wmpvp.com",
    service: "WeChat mini-program media",
    observedAt: "2026-08-08",
    reason: "Domestic App media request was observed falling through to the proxy",
  }),
  Object.freeze({
    suffix: "bytehwm.com",
    service: "ByteDance font and static CDN",
    observedAt: "2026-08-08",
    reason: "Domestic static asset request was observed falling through to the proxy",
  }),
  Object.freeze({
    suffix: "rtbasia.com",
    service: "Observed domestic App dependency",
    observedAt: "2026-08-08",
    reason: "App dependency was observed using the proxy during domestic workflow testing",
  }),
  Object.freeze({
    suffix: "sandbox.itunes.apple.com",
    service: "Apple sandbox purchase validation",
    observedAt: "2026-08-08",
    reason: "Sandbox validation request was observed using the proxy during domestic App testing",
  }),
]);
