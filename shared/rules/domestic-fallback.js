/**
 * Small, local safety-net suffixes for domestic app traffic.
 *
 * The full ChinaMax domain source remains authoritative. These entries only
 * keep common domestic app/CDN traffic from falling through to the proxy when
 * a large remote rule set is stale or does not contain a newly-used hostname.
 */
export const DOMESTIC_FALLBACK_DOMAIN_SUFFIXES = Object.freeze([
  "cn",
  "bilibili.com",
  "bilivideo.com",
  "biliapi.com",
  "hdslb.com",
  "douyin.com",
  "douyincdn.com",
  "byteimg.com",
  "ibytedtos.com",
  "pstatp.com",
  "snssdk.com",
  "amemv.com",
  "ixigua.com",
  "toutiao.com",
  "toutiaoimg.com",
  "xiaohongshu.com",
  "xhscdn.com",
  "weibo.com",
]);
