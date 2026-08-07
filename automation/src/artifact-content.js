import { createHash } from "node:crypto";

export function artifactBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (typeof content !== "string") throw new TypeError("Artifact content must be a string or Buffer");
  return Buffer.from(content, "utf8");
}

export function artifactByteLength(content) {
  return artifactBuffer(content).byteLength;
}

export function artifactSha256(content) {
  return createHash("sha256").update(artifactBuffer(content)).digest("hex");
}
