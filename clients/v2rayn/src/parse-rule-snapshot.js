const DOMAIN_PREFIX=/^(?:domain:|full:|regexp:|keyword:)/u;
const IP_VALUE=/^[0-9a-f:.]+\/[0-9]+(?:,no-resolve)?$/iu;
const NO_RESOLVE_SUFFIX=/,no-resolve$/iu;
export function parseV2rayNRuleSnapshot(value,{channel='current'}={}) {
 let snapshot=value;
 if(typeof value==='string'){try{snapshot=JSON.parse(value);}catch{throw new Error('v2rayN remote rule snapshot is invalid JSON');}}
 if(!snapshot||snapshot.schemaVersion!==1||snapshot.channel!==channel||!snapshot.sources||Array.isArray(snapshot.sources)) throw new Error('v2rayN remote rule snapshot manifest is invalid');
 const out={};
 for(const [id,source] of Object.entries(snapshot.sources)){
  if(!source||typeof source!=='object'||Array.isArray(source)) throw new Error(`Invalid v2rayN rule source: ${id}`);
  for(const kind of ['domain','ip']) if(source[kind]!==undefined && (!Array.isArray(source[kind])||source[kind].some(v=>typeof v!=='string'||(kind==='domain'&&!DOMAIN_PREFIX.test(v) || kind==='ip'&&!IP_VALUE.test(v))))) throw new Error(`Invalid v2rayN ${kind} source: ${id}`);
  out[id]={
   domain:[...(source.domain??[])],
   ip:(source.ip??[]).map(value=>value.replace(NO_RESOLVE_SUFFIX,'')),
  };
 }
 return Object.freeze(out);
}
