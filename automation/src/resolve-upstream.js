const COMMITS_API = "https://api.github.com/repos/blackmatrix7/ios_rule_script/commits/master";

export async function resolveUpstreamCommit(fetchImpl = globalThis.fetch, now = Date.now()) {
  if (typeof fetchImpl !== "function") throw new TypeError("Upstream resolver requires fetch");
  let response;
  try {
    response = await fetchImpl(COMMITS_API, {
      redirect: "manual",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Juan-nikola-apple-proxy-profiles",
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("Blackmatrix7 resolver network failure");
  }
  if (response.status !== 200) throw new Error(`Blackmatrix7 resolver HTTP status ${response.status}`);
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Blackmatrix7 resolver returned invalid JSON");
  }
  const sha = payload?.sha;
  const committedAt = payload?.commit?.committer?.date;
  if (typeof sha !== "string" || !/^[0-9a-f]{40}$/u.test(sha)) {
    throw new Error("Blackmatrix7 resolver returned an invalid commit");
  }
  const timestamp = typeof committedAt === "string" ? Date.parse(committedAt) : Number.NaN;
  if (!Number.isFinite(timestamp) || timestamp > now + 5 * 60_000) {
    throw new Error("Blackmatrix7 resolver returned an invalid commit time");
  }
  return Object.freeze({ sha, committedAt: new Date(timestamp).toISOString().replace(".000Z", "Z") });
}
