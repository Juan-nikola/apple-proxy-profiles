import assert from 'node:assert/strict';
import test from 'node:test';
import { inlineGeoDataRules } from '../src/inline-geodata.js';

test('inline pack expands every predicate without turning empty categories into catch-all rules',()=>{
 const rules=[{domain:['ext:Site.dat:APP-A'],outboundTag:'fixed',enabled:true},{ip:['ext:IP.dat:APP-A'],outboundTag:'fixed',enabled:true},{network:'tcp,udp',outboundTag:'proxy',enabled:true}];
 const assets={'Site.dat':{type:'domain',entries:[{code:'APP-A',domains:[{type:2,value:'example.com'},{type:3,value:'only.test'}]}]},'IP.dat':{type:'ip',entries:[{code:'APP-A',cidrs:[]}]}};
 const result=inlineGeoDataRules(rules,assets);
 assert.equal(result.length,2);
 assert.deepEqual(result[0].domain,['domain:example.com','full:only.test']);
 assert.equal(result.at(-1).outboundTag,'proxy');
 assert.equal(JSON.stringify(result).includes('ext:'),false);
 assert.equal(rules.length,3);
 assert.throws(()=>inlineGeoDataRules(rules,{}),/asset/i);
 assert.throws(()=>inlineGeoDataRules(rules,{'Site.dat':{type:'domain',entries:[]}}),/category/i);
});

test('inline pack preserves Xray regex, keyword and IPv6 CIDR semantics',()=>{
 const result=inlineGeoDataRules([{domain:['ext:S.dat:APP-X'],outboundTag:'proxy'},{ip:['ext:I.dat:APP-X'],outboundTag:'direct'}],{'S.dat':{type:'domain',entries:[{code:'APP-X',domains:[{type:0,value:'keyword'},{type:1,value:'^test\\.'}]}]},'I.dat':{type:'ip',entries:[{code:'APP-X',cidrs:[{ip:'2001:db8::',prefix:32}]}]}});
 assert.deepEqual(result[0].domain,['domain:keyword','regexp:^test\\.']);
 assert.deepEqual(result[1].ip,['2001:db8::/32']);
});
