export const POLICY_PLATFORM_PRESETS = Object.freeze({
  macos: Object.freeze({ testInterval: 600, timeout: 5, tolerance: 100 }),
  iphone: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
  ipad: Object.freeze({ testInterval: 1800, timeout: 7, tolerance: 150 }),
  appletv: Object.freeze({ testInterval: 3600, timeout: 8, tolerance: 200 }),
});

export function platformPolicyPreset(platform) {
  if (typeof platform !== "string" || !Object.hasOwn(POLICY_PLATFORM_PRESETS, platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return POLICY_PLATFORM_PRESETS[platform];
}
