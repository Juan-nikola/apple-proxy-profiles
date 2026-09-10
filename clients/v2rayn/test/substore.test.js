import test from 'node:test';
import assert from 'node:assert/strict';
import { operator } from '../src/substore-routing-entry.js';
import { orderedRoutingPlan } from '../../../shared/rules/lightweight-policy.js';
const snapshot = () => ({schemaVersion:1,channel:'current',sources:Object.fromEntries(orderedRoutingPlan().map(({id})=>[id,{domain:[`domain:${id.toLowerCase()}.test`],ip:[]}]))});
const nodes=[{name:'US Home',type:'vless',server:'fixture.invalid',port:443,uuid:'TEST_ONLY_UUID'}];
const args={output:'config',type:'collection',name:'apple-proxy-v2rayn',platform:'macos',core:'xray',channel:'current'};
globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify(snapshot())});
const context={arguments:args,produceArtifact:async r=>r.type==='file'?{$content:JSON.stringify({schemaVersion:2,targets:{ai:'NODE~US Home|vless'}})}:nodes};
test('Sub-Store route task consumes remote rules and private policy into a self-contained RulesItem array',async()=>{
 const out=await operator({$content:JSON.stringify(snapshot())},undefined,context);
 const rules=JSON.parse(out.$content);
 assert.ok(rules.find(r=>r.remarks==='OpenAI / domain').outboundTag.includes('US Home'));
 assert.equal(rules.find(r=>r.remarks==='GitHub / domain').outboundTag,'proxy');
 assert.equal(JSON.stringify(rules).includes('ext:'),false);
 assert.ok(rules.every(r=>!(r.domain&&r.ip)));
});
test('route task rejects incomplete remote rules before output can broaden into catch-all routing',async()=>{
 const bad=snapshot();delete bad.sources.OpenAI;
 await assert.rejects(()=>operator({$content:JSON.stringify(bad)},undefined,context),/source/i);
 await assert.rejects(()=>operator({$content:'<html>error</html>'},undefined,context),/rule/i);
});
