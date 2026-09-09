import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNodes } from '../../../shared/nodes/normalize-nodes.js';
import { resolveUnifiedPolicy } from '../../../shared/policies/resolve-unified.js';
import { renderV2rayNNativeRouting } from '../src/render-native-routing.js';

const nodes = normalizeNodes([
  { name:'US Home',type:'vless',server:'us.example',port:443,uuid:'TEST_ONLY_UUID_A' },
  { name:'US Home',type:'trojan',server:'us.example',port:443,password:'TEST_ONLY_PASSWORD',tls:true },
  { name:'JP Tokyo',type:'vless',server:'jp.example',port:443,uuid:'TEST_ONLY_UUID_B' },
]).nodes;
const options={channel:'current',region:'cn',blockMode:'balanced',quicMode:'proxy-block'};
const resolve = (ai='NODE~US Home|VLESS') => resolveUnifiedPolicy({policy:{schemaVersion:2,targets:{ai}},client:'v2rayn',allNodes:nodes,eligibleNodes:nodes});

test('native FOLLOW uses runtime proxy while fuzzy protocol-qualified AI uses the imported node remark',()=>{
 const rules=renderV2rayNNativeRouting({nodes,options,policyResolution:resolve()});
 assert.ok(Array.isArray(rules));
 const ai=rules.find(r=>r.remarks==='OpenAI / domain');
 assert.equal(ai.outboundTag,nodes.find(n=>n.type==='vless'&&n._profile.originalName==='US Home').name);
 assert.equal(rules.find(r=>r.remarks==='GitHub / domain').outboundTag,'proxy');
 assert.equal(rules.at(-1).outboundTag,'proxy');
 assert.ok(rules.every(r=>r.enabled===true && r.type==='field'));
 assert.ok(rules.every(r=>!(r.domain&&r.ip)));
 assert.ok(rules.every(r=>r.network===undefined||['tcp,udp','udp','tcp'].includes(r.network)));
 assert.ok(rules.filter(r=>r.port==='443').every(r=>r.network==='udp'&&r.outboundTag==='block'));
});

test('native import preserves private/direct routing and does not block QUIC on direct businesses',()=>{
 const rules=renderV2rayNNativeRouting({nodes,options,policyResolution:resolve()});
 assert.equal(rules.find(r=>r.remarks==='Apple / domain').outboundTag,'direct');
 assert.equal(rules.filter(r=>r.remarks?.startsWith('Apple')&&r.port==='443').length,0);
 assert.ok(rules[0].ip.includes('127.0.0.0/8'));
 assert.equal(rules.some(r=>r.remarks?.includes('loyalsoldier')),false);
});

test('missing/ambiguous fuzzy node policies reject generation',()=>{
 assert.throws(()=>resolve('NODE~missing|vless'),/missing/i);
 assert.throws(()=>resolve('NODE~US Home'),/ambiguous/i);
 const r=resolve();
 assert.throws(()=>renderV2rayNNativeRouting({nodes:[],options,policyResolution:r}),/node/i);
});

test('native final fixed policy does not change the meaning of FOLLOW businesses',()=>{
 const policyResolution=resolveUnifiedPolicy({policy:{schemaVersion:2,targets:{final:'NODE~JP Tokyo',ai:'FOLLOW'}},client:'v2rayn',allNodes:nodes,eligibleNodes:nodes});
 const rules=renderV2rayNNativeRouting({nodes,options,policyResolution});
 assert.equal(rules.at(-1).outboundTag,nodes.find(n=>n._profile.originalName==='JP Tokyo').name);
 assert.equal(rules.find(r=>r.remarks==='OpenAI / domain').outboundTag,'proxy');
});
