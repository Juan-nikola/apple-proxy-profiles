import { CONTINENT, SOURCE_KIND } from "../contracts.js";
import { CONTINENT_FLAGS } from "../nodes/country-regions.js";

export const ALL_NODES_FILTER = "^.+$";
export const NON_CHAINED_FILTER = "^(?!🔗 ).+$";
export const ENTRY_FILTER = "^(?!🔗 )(?!.*·链).+｜(?:机场|自建|Realm)(?:·.*)?$";
export const P2P_FILTER = "^(?!🔗 ).+｜(?:自建|Realm|链式代理)(?:·.*)?$";
export const GAME_FILTER = "^(?!🔗 ).+·U$";
export const CHAINED_NODES_FILTER = "^🔗 .+$";

export const CONTINENTS = Object.freeze([
  Object.freeze({
    key: CONTINENT.asiaPacific,
    name: "🌏 亚太",
    helperName: "亚太",
    flags: CONTINENT_FLAGS[CONTINENT.asiaPacific],
  }),
  Object.freeze({
    key: CONTINENT.europe,
    name: "🌍 欧洲",
    helperName: "欧洲",
    flags: CONTINENT_FLAGS[CONTINENT.europe],
  }),
  Object.freeze({
    key: CONTINENT.americas,
    name: "🌎 美洲",
    helperName: "美洲",
    flags: CONTINENT_FLAGS[CONTINENT.americas],
  }),
  Object.freeze({
    key: CONTINENT.other,
    name: "🌐 其他/未分类",
    helperName: "其他/未分类",
    flags: Object.freeze([]),
  }),
]);

export const SOURCE_GROUPS = Object.freeze([
  Object.freeze({ kind: SOURCE_KIND.selfHosted, name: "🏠 自建节点", filter: "^.+｜自建(?:·.*)?$" }),
  Object.freeze({ kind: SOURCE_KIND.airport, name: "🏢 机场节点", filter: "^.+｜机场(?:·.*)?$" }),
  Object.freeze({ kind: SOURCE_KIND.realm, name: "↪️ Realm 转发", filter: "^.+｜Realm(?:·.*)?$" }),
  Object.freeze({ kind: SOURCE_KIND.serverChain, name: "⛓️ 链式代理", filter: "^.+｜链式代理(?:·.*)?$" }),
]);

export function continentFilter(continent) {
  if (continent.key === CONTINENT.other) {
    const knownFlags = CONTINENTS.flatMap((record) => record.flags).join("|");
    return `^(?!(?:🔗|${knownFlags}))\\S+ .+$`;
  }
  return `^(?:${continent.flags.join("|")}) .+$`;
}
