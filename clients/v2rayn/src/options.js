import { validateCollectionName } from '../../../shared/substore/collection-name.js';
import { parseRegion } from '../../../shared/rules/region-values.js';
export function parseV2rayNOptions(raw={}) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw new TypeError('v2rayN options must be an object');
 const output=raw.output;if(!['nodes','config','routing'].includes(output)) throw new Error('v2rayN output is unsupported');
 if(raw.type!=='collection') throw new Error('v2rayN type must be collection');
 if(typeof raw.name!=='string') throw new Error('v2rayN name is required');
 if(output==='routing' && !['windows','macos'].includes(raw.platform)) throw new Error('v2rayN routing platform is required');
 return Object.freeze({output,type:'collection',name:validateCollectionName(raw.name,'v2rayN name'),platform:raw.platform,channel:raw.channel??'current',region:parseRegion(raw.region??'cn'),core:raw.core??'xray',blockMode:raw.blockMode??'balanced',quicMode:raw.quicMode??'proxy-block',clientChain:raw.clientChain??'off'});
}
