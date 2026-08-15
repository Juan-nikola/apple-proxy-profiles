/**
 * Critical Google/YouTube DNS suffixes that must resolve through the global
 * proxy DNS even when a remote rule-set is unavailable or lagging.
 *
 * These are kept intentionally small: they cover the domains most likely to
 * be poisoned or blocked before a client can download the full rule-set, and
 * each client renders them as inline fallback rules ahead of the China-first
 * DNS catch-all.
 */
export const PROXY_DNS_DOMAIN_SUFFIXES = Object.freeze([
  "google.com",
  "googleapis.com",
  "googleusercontent.com",
  "gstatic.com",
  "ggpht.com",
  "gvt1.com",
  "googlevideo.com",
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "ytimg.com",
]);
