import { parsePrivatePolicy } from "../policies/private-policy.js";

export const POLICY_ARTIFACT_NAME = "apple-proxy-policy";

function contentOf(artifact) {
  if (typeof artifact === "string" || artifact instanceof Uint8Array) return artifact;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return null;
  if (typeof artifact.$content === "string" || artifact.$content instanceof Uint8Array) return artifact.$content;
  if (typeof artifact.content === "string" || artifact.content instanceof Uint8Array) return artifact.content;
  if (Object.hasOwn(artifact, "schemaVersion")) return JSON.stringify(artifact);
  return null;
}

export async function loadSubstorePolicyArtifact(context, name = POLICY_ARTIFACT_NAME) {
  if (!context || typeof context.produceArtifact !== "function") {
    throw new Error("Sub-Store policy artifact is unavailable");
  }
  const artifact = await context.produceArtifact({
    type: "file",
    name,
    platform: "JSON",
    produceType: "internal",
  });
  const content = contentOf(artifact);
  if (content === null) throw new Error("Sub-Store policy artifact has no content");
  return parsePrivatePolicy(content);
}
