const SING_BOX_REPOSITORY = "https://github.com/SagerNet/sing-box";
const SING_BOX_API = "https://api.github.com/repos/SagerNet/sing-box/commits";

export async function resolveSingBoxUpstream({ branch = "testing", fetchImpl = fetch, now = new Date() } = {}) {
  if (typeof branch !== "string" || !/^[A-Za-z0-9._/-]+$/u.test(branch)) throw new TypeError("sing-box branch is invalid");
  const response = await fetchImpl(`${SING_BOX_API}/${encodeURIComponent(branch)}`, {
    headers: { accept: "application/vnd.github+json" },
  });
  if (!response?.ok) throw new Error(`sing-box ${branch} branch resolver failed`);
  const payload = await response.json();
  if (!payload || typeof payload.sha !== "string" || !/^[0-9a-f]{40}$/u.test(payload.sha)) {
    throw new Error("sing-box resolver returned an invalid commit");
  }
  const fetchedAt = now instanceof Date ? now.toISOString() : String(now);
  if (Number.isNaN(Date.parse(fetchedAt))) throw new TypeError("sing-box resolver timestamp is invalid");
  return Object.freeze({ repository: SING_BOX_REPOSITORY, branch, commit: payload.sha, fetchedAt });
}
