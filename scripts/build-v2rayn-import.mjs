import {readFile,writeFile,mkdir,chmod,rename,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeNodes} from '../shared/nodes/normalize-nodes.js';
import {filterNodesForClient} from '../shared/nodes/capabilities.js';
import {parsePrivatePolicy} from '../shared/policies/private-policy.js';
import {resolveUnifiedPolicy} from '../shared/policies/resolve-unified.js';
import {UNIFIED_POLICY_TARGETS} from '../shared/policies/unified-policy.js';
import {renderV2rayNSubscription,renderXrayOutbound} from '../clients/v2rayn/src/render-node.js';
import {renderV2rayNNativeRouting} from '../clients/v2rayn/src/render-native-routing.js';
import {inlineGeoDataRules} from '../clients/v2rayn/src/inline-geodata.js';
import {decodeXrayGeoData} from '../automation/src/render-xray-geodata.js';
const ROOT=resolve(import.meta.dirname,'..');

export async function buildV2rayNImport({rawNodes,policy,output,geoDirectory=resolve(ROOT,'public/current/geodata/cn')}) {
  const options={channel:'current',region:'cn',blockMode:'balanced',quicMode:'proxy-block'};
  const normalized=normalizeNodes(rawNodes);
  const filtered=filterNodesForClient(normalized.nodes,'v2rayn');
  const nodes=filtered.nodes;
  if(!nodes.length) throw new Error('No compatible v2rayN nodes');
  const policyResolution=resolveUnifiedPolicy({policy:parsePrivatePolicy(JSON.stringify(policy)),client:'v2rayn',allNodes:normalized.nodes,eligibleNodes:nodes});
  const referenceRules=renderV2rayNNativeRouting({nodes,options,policyResolution});
  const manifest=JSON.parse(await readFile(resolve(geoDirectory,'manifest.json'),'utf8'));
  if(manifest.channel!=='current'||manifest.region!=='cn') throw new Error('GeoData region/channel mismatch');
  const assets={};
  for(const kind of ['domain','ip']) {
    const record=manifest[kind];
    if(!/^AppleProxy(?:Site|IP)Current$/.test(record?.name??'')) throw new Error('Invalid GeoData filename');
    const filename=record.name+'.dat';
    const buffer=await readFile(resolve(geoDirectory,filename));
    if(buffer.byteLength!==record.byteLength||createHash('sha256').update(buffer).digest('hex')!==record.sha256) throw new Error('GeoData checksum mismatch');
    assets[filename]=decodeXrayGeoData(buffer,kind);
  }
  const rules=inlineGeoDataRules(referenceRules,assets);
  const subscription=renderV2rayNSubscription({nodes});
  // Validate that every selectable node is renderable by our Xray boundary.
  const outbounds=nodes.map((n,i)=>renderXrayOutbound(n,{tag:`ap-node-${i.toString(36)}`,client:'v2rayn'}));
  const audit={generatedAt:new Date().toISOString(),upstreamContract:'2dust/v2rayN tag 7.24.9',mode:'native-routing',nodes:nodes.length,rules:rules.length,excluded:filtered.diagnostics.excluded,sourceHashes:manifest.hashes,policies:UNIFIED_POLICY_TARGETS.map(t=>({business:t.label,configured:policyResolution.targets[t.id].configured,destination:policyResolution.targets[t.id].resolved})),limitations:['Native importer resolves fixed outbounds by exact node remark. Do not delete or rename required nodes; upstream falls back to proxy with a warning if a reference disappears.','This package is imported through Routing settings, not as a custom full JSON node.','Updating a node subscription does not refresh routing. Rebuild and reimport routing after policy or required-node names change.']};
  const readme=`v2rayN Xray 导入包\n\n使用官方 v2rayN 7.24.9。普通节点使用 Xray 内核。\n\n1. 主界面“服务器”→“从文件导入批量 URL”，选择 nodes.txt；或复制其中内容后从剪贴板导入。\n   若已经使用 apple-proxy-v2rayn 对应节点订阅，保留原订阅即可，不必重复导入。\n2. 设置→路由设置，新建一组 Apple Proxy Xray，域名策略选择 IPIfNonMatch。\n   打开该组的规则编辑，使用“从文件导入规则”导入 routing.json；选择替换，保存并启用此路由组。\n3. 选中一个普通节点作为活动服务器，启用自动配置系统代理。不要激活旧 Custo 完整配置，不要开启全局代理路由。\n   若曾启用“全配置模板”，先关闭它，避免覆盖原生路由。\n\n跟随默认的业务出站为 proxy。AI 的固定出站已经按你的 apple-proxy-policy 匹配；详见 audit.json。\n切换活动服务器后，FOLLOW 业务跟随，AI 仍使用固定节点。Apple/Microsoft/国内业务直连。\n本路由文件已经内联所有引用的规则，不需要复制 geosite/geoip 文件或配置规则下载路径。\n\n更新：节点可继续通过原 Sub-Store 节点订阅更新。修改 policy 后重新生成本导入包并替换导入 routing.json。\n不要重命名或删除被固定业务引用的节点；v2rayN 对找不到的节点会警告并回退 proxy，不能把这种情况当作仍在固定线路运行。\n本包包含私密节点信息，请勿提交到公开仓库。\n`;
  // Write only after all validation; temporary sibling avoids partial new files.
  await mkdir(output,{recursive:true,mode:0o700}); await chmod(output,0o700);
  for(const [file,content] of Object.entries({'nodes.txt':Buffer.from(subscription.trim(),'base64').toString('utf8')+'\n','subscription.txt':subscription,'routing.json':JSON.stringify(rules,null,2)+'\n','audit.json':JSON.stringify(audit,null,2)+'\n','使用说明.txt':readme})) {
    const target=resolve(output,file),temp=target+'.tmp';
    await writeFile(temp,content,{mode:0o600});await chmod(temp,0o600);await rename(temp,target);
  }
  return {nodes,rules,outbounds,audit};
}

async function main(){
 const args=process.argv.slice(2), opts={};
 for(let i=0;i<args.length;i+=2){if(!['--nodes','--policy','--output'].includes(args[i])||!args[i+1])throw new Error('Use --nodes FILE --policy FILE --output PRIVATE_DIRECTORY');opts[args[i].slice(2)]=args[i+1];}
 if(!opts.nodes||!opts.policy||!opts.output)throw new Error('Use --nodes FILE --policy FILE --output PRIVATE_DIRECTORY');
 const result=await buildV2rayNImport({rawNodes:JSON.parse(await readFile(opts.nodes,'utf8')),policy:JSON.parse(await readFile(opts.policy,'utf8')),output:resolve(opts.output)});
 console.log(JSON.stringify({nodes:result.nodes.length,rules:result.rules.length,output:resolve(opts.output)}));
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('v2rayN import pack generation failed; inputs or GeoData did not validate. No private details logged.');process.exitCode=1;});
