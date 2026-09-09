import {createServer,request} from 'node:http';
import {createServer as tcpServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {normalizeNodes} from '../shared/nodes/normalize-nodes.js';
import {filterNodesForClient} from '../shared/nodes/capabilities.js';
import {renderXrayOutbound} from '../shared/nodes/render-xray-outbound.js';

function coreRules(rules,names){
 return rules.map(({enabled,remarks,id,...rule})=>{
   if(!['proxy','direct','block'].includes(rule.outboundTag)) {
     const tag=names.get(rule.outboundTag);
     if(!tag)throw new Error('Fixed native route does not name an imported node');
     return {...rule,type:'field',outboundTag:tag};
   }
   return {...rule,type:'field'};
 });
}
function testCore(bin,path){
 const result=spawnSync(bin,['run','-test','-config',path],{encoding:'utf8',timeout:30000});
 if(result.status!==0)throw new Error('Xray rejected generated config: '+(result.stderr||result.stdout).replace(/\s+/g,' ').slice(-200));
}
async function listen(server){await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});return server.address().port;}
async function close(server){await new Promise(ok=>server.close(ok));}
async function response(port,domain){return new Promise((ok,fail)=>{const r=request({hostname:'127.0.0.1',agent:false,port,path:`http://${domain}/`,headers:{host:domain},timeout:2500},res=>{let text='';res.on('data',d=>text+=d);res.on('end',()=>ok(text));});r.on('timeout',()=>r.destroy(new Error('proxy timeout')));r.on('error',fail);r.end();});}

export async function checkV2rayNXray({bin,rawNodes,rules}){
 const nodes=filterNodesForClient(normalizeNodes(rawNodes).nodes,'v2rayn').nodes;
 const tags=new Map(nodes.map((n,i)=>[n.name,`ap-node-${i.toString(36)}`]));
 const routing={domainStrategy:'IPIfNonMatch',rules:coreRules(rules,tags)};
 const outbounds=nodes.map(n=>renderXrayOutbound(n,{tag:tags.get(n.name),client:'v2rayn'}));
 const dir=await mkdtemp(resolve(tmpdir(),'v2rayn-check-'));
 const sample=tcpServer();const port=await listen(sample);await close(sample);
 const inbound={tag:'http-in',listen:'127.0.0.1',port,protocol:'http',settings:{}};
 try{
   // All real outbounds are included; test each GUI default separately.
   for(const selected of outbounds){
     const config={log:{loglevel:'warning'},inbounds:[inbound],outbounds:[{...selected,tag:'proxy'},...outbounds,{tag:'direct',protocol:'freedom'},{tag:'block',protocol:'blackhole'}],routing};
     const path=resolve(dir,'real.json');await writeFile(path,JSON.stringify(config),{mode:0o600});testCore(bin,path);
   }
   const servers=[];const endpoints={};
   for(const label of ['default-A','default-B','fixed','direct']){
     const server=createServer((req,res)=>res.end(label));servers.push(server);endpoints[label]=await listen(server);
   }
   const outcomes=[];
   try{
     for(const selected of ['default-A','default-B']){
       const freedom=(tag,label)=>({tag,protocol:'freedom',settings:{redirect:`127.0.0.1:${endpoints[label]}`}});
       const config={log:{loglevel:'warning'},inbounds:[inbound],outbounds:[freedom('proxy',selected),...outbounds.map(o=>freedom(o.tag,'fixed')),freedom('direct','direct'),{tag:'block',protocol:'blackhole'}],routing};
       const path=resolve(dir,'probe.json');await writeFile(path,JSON.stringify(config));testCore(bin,path);
       const child=spawn(bin,['run','-config',path],{stdio:['ignore','pipe','pipe']});
       let trace='';child.stdout.on('data',d=>trace+=d);child.stderr.on('data',d=>trace+=d);
       let spawnError;child.on('error',err=>spawnError=err);
       try{
         let ready=false;
         for(let i=0;i<40;i++){
           if(spawnError)throw spawnError;
           if(child.exitCode!==null)throw new Error('Xray exited before proxy was ready');
           try{await response(port,'unmatched.invalid');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}
         }
         if(!ready)throw new Error('Xray startup timeout');
         for(const [domain,expected] of [['api.openai.com','fixed'],['github.com',selected],['youtube.com',selected],['apple.com.akadns.net','direct'],['microsoft.com','direct'],['unmatched.invalid',selected]]){
           let actual;try{actual=await response(port,domain);}catch(error){throw new Error(`Forwarding check ${domain}: ${error.message}; trace ${trace.slice(-1400)}`);}
           if(actual!==expected)throw new Error(`Unexpected business routing for ${domain}: ${actual} instead of ${expected}`);
           outcomes.push({default:selected,domain,expected,actual});
         }
       } finally {
         if(child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exited;}
       }
     }
   }finally{await Promise.all(servers.map(close));}
   return {realConfigsTested:outbounds.length,forwardingChecks:outcomes.length,outcomes};
 }finally{await rm(dir,{recursive:true,force:true});}
}
async function main(){
 const [nodesPath,rulesPath,resultPath]=process.argv.slice(2);
 if(!process.env.XRAY_BIN||!nodesPath||!rulesPath)throw new Error('XRAY_BIN and nodes/rules file arguments required');
 const result=await checkV2rayNXray({bin:process.env.XRAY_BIN,rawNodes:JSON.parse(await readFile(nodesPath,'utf8')),rules:JSON.parse(await readFile(rulesPath,'utf8'))});
 if(resultPath)await writeFile(resultPath,JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
