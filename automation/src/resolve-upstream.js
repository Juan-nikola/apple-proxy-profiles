const COMMITS_ATOM = "https://github.com/blackmatrix7/ios_rule_script/commits/master.atom";
const RETRY_DELAYS_MS = Object.freeze([1_000, 2_000]);

function sleep(delayMs) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));
}

function retryableStatus(status) {
  return status === 429 || (Number.isInteger(status) && status >= 500 && status <= 599);
}

function attribute(element, name) {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "u").exec(element);
  return match?.[1] ?? null;
}

export async function resolveUpstreamCommit(
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  sleepImpl = sleep,
) {
  if (typeof fetchImpl !== "function") throw new TypeError("Upstream resolver requires fetch");
  if (typeof sleepImpl !== "function") throw new TypeError("Upstream resolver requires sleep");
  let response;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      response = await fetchImpl(COMMITS_ATOM, {
        redirect: "manual",
        headers: {
          Accept: "application/atom+xml",
          "User-Agent": "Juan-nikola-apple-proxy-profiles",
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error("Blackmatrix7 resolver network failure");
    }
    if (response?.status === 200) break;
    const status = response?.status;
    if (!retryableStatus(status) || attempt === RETRY_DELAYS_MS.length) {
      throw new Error(`Blackmatrix7 resolver HTTP status ${status ?? "missing"}`);
    }
    await sleepImpl(RETRY_DELAYS_MS[attempt]);
  }
  let feed;
  try {
    feed = await response.text();
  } catch {
    throw new Error("Blackmatrix7 resolver returned an invalid commit");
  }
  if (typeof feed !== "string") throw new Error("Blackmatrix7 resolver returned an invalid commit");
  const entry = /<entry\b[^>]*>[\s\S]*?<\/entry>/u.exec(feed)?.[0] ?? null;
  const idShas = [...(entry ?? "").matchAll(
    /<id>tag:github\.com,2008:Grit::Commit\/([0-9a-f]{40})<\/id>/gu,
  )].map((match) => match[1]);
  const links = entry?.match(/<link\b[^>]*>/gu) ?? [];
  const linkShas = [];
  for (const link of links) {
    if (attribute(link, "rel") !== "alternate" || attribute(link, "type") !== "text/html") continue;
    const match = /^https:\/\/github\.com\/blackmatrix7\/ios_rule_script\/commit\/([0-9a-f]{40})$/u.exec(
      attribute(link, "href") ?? "",
    );
    if (match) linkShas.push(match[1]);
  }
  if (idShas.length !== 1 || linkShas.length !== 1 || idShas[0] !== linkShas[0]) {
    throw new Error("Blackmatrix7 resolver returned an invalid commit");
  }
  const committedAt = /<updated>([^<]+)<\/updated>/u.exec(entry)?.[1] ?? null;
  const timestamp = typeof committedAt === "string" ? Date.parse(committedAt) : Number.NaN;
  if (!Number.isFinite(timestamp) || timestamp > now + 5 * 60_000) {
    throw new Error("Blackmatrix7 resolver returned an invalid commit time");
  }
  return Object.freeze({ sha: idShas[0], committedAt: new Date(timestamp).toISOString().replace(".000Z", "Z") });
}
