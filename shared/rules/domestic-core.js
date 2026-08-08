import { RULE_BUDGETS } from "./lightweight-policy.js";

function normalizedSuffixes(values, name) {
  const normalized = values.map((value) => {
    if (typeof value !== "string") throw new TypeError(`${name} suffix must be a string`);
    return value.trim().toLowerCase().replace(/^\.+/u, "").replace(/\.+$/u, "");
  });
  if (normalized.some((value) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u.test(value))) {
    throw new TypeError(`${name} contains an invalid domain suffix`);
  }
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${name} contains a duplicate suffix`);
  return Object.freeze(normalized);
}

export const DOMESTIC_CORE_DOMAIN_SUFFIXES = normalizedSuffixes([
  "bilibili.com", "bilibili.net", "bilibili.tv", "bilibili.cc",
  "bilivideo.com", "bilivideo.net", "biliapi.com", "hdslb.com", "hdslb.org",
  "douyin.com", "douyincdn.com", "byteimg.com", "ibytedtos.com", "pstatp.com",
  "snssdk.com", "amemv.com", "ixigua.com", "toutiao.com", "toutiaoimg.com",
  "xiaohongshu.com", "xhscdn.com", "weibo.com", "sinaimg.cn",
  "qq.com", "qpic.cn", "qlogo.cn", "gtimg.cn", "gtimg.com", "wechat.com",
  "iqiyi.com", "iqiyipic.com", "qiyi.com", "qiyipic.com", "youku.com", "tudou.com", "tudouui.com",
  "ykimg.com", "mgtv.com", "hunantv.com",
  "baidu.com", "bdstatic.com", "bdimg.com", "bcebos.com",
  "taobao.com", "tmall.com", "alipay.com", "alibaba.com", "alicdn.com", "aliyun.com", "aliyuncs.com",
  "163.com", "126.com", "netease.com", "amap.com", "autonavi.com",
  // Confirmed domestic CDN/app endpoints observed in client traces and the
  // supplied reference profile. Keep this list small; unknown names are
  // classified by China-first DNS plus ChinaIP/GeoIP in every client.
  "wmpvp.com", "bytehwm.com", "rtbasia.com", "sandbox.itunes.apple.com",
  "douyu.com", "douyu.tv", "douyutv.com", "douyuscdn.com", "douyucdn.cn", "huya.com",
], "Domestic core");

export const DOMESTIC_GAME_DOMAIN_SUFFIXES = normalizedSuffixes([
  "leiting.com", "leitingcn.com", "g-bits.com", "tencentgames.com", "neteasegames.com",
  "wangyigames.com", "mihoyo.com", "yuanshen.com", "biligame.com", "xindong.com",
  "xd.com", "perfectworld.com", "wanmei.com", "duoyi.com", "4399.com", "taptap.com", "taptap.cn",
], "Domestic game");

if (DOMESTIC_CORE_DOMAIN_SUFFIXES.length > RULE_BUDGETS.domesticCoreEntries) {
  throw new RangeError("Domestic core exceeds its entry budget");
}
