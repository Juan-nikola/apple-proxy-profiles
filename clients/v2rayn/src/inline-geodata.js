/** Expand verified GeoData into a portable native routing array. No credentials. */
export function inlineGeoDataRules(rules, assets) {
  const index=new Map(Object.entries(assets).map(([file,asset])=>[file,{...asset,byCode:new Map(asset.entries.map(entry=>[entry.code,entry]))}]));
  const prefixes=['domain:','regexp:','domain:','full:'];
  return rules.flatMap(rule=>{
    const copy={...rule};
    for(const kind of ['domain','ip']) {
      if(!rule[kind]) continue;
      copy[kind]=[...new Set(rule[kind].flatMap(value=>{
        if(!value.startsWith('ext:')) return [value];
        const match=/^ext:([^:]+):([^:]+)$/.exec(value);
        if(!match) throw new Error('Invalid external GeoData reference');
        const asset=index.get(match[1]);
        if(!asset || asset.type!==kind) throw new Error('Required GeoData asset is missing or has wrong type');
        const category=asset.byCode.get(match[2]);
        if(!category) throw new Error('Required GeoData category is missing');
        return kind==='ip' ? category.cidrs.map(c=>`${c.ip}/${c.prefix}`) : category.domains.map(d=>{
          if(prefixes[d.type]===undefined) throw new Error('Unsupported GeoData domain type');
          return `${prefixes[d.type]}${d.value}`;
        });
      }))];
      // An empty domain/IP category must never become an unrestricted rule.
      if(copy[kind].length===0) return [];
    }
    return [copy];
  });
}
