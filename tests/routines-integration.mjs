import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const signin=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signin.headers.get('set-cookie').split(';')[0];
async function api(path,method='GET',body,options={}) {
 const r=await fetch(base+path,{method,headers:{cookie,origin:base,'content-type':'application/json',...options},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(() => null); return {status:r.status,data};
}
assert.equal((await fetch(base+'/api/routines')).status,401);
let initial=await api('/api/routines'); assert.equal(initial.status,200); assert.equal(initial.data.routines.length,0);
const baseCount=initial.data.history.at(-1).count;
const id=crypto.randomUUID(), other='8e5e6f0f-172e-4cd6-b0eb-2d81867fe1b2';
assert.equal((await api('/api/routines','DELETE',{id:other,revision:1})).status,409);
assert.equal((await api('/api/routines','POST',{id,title:'Synthetic daily item'},{origin:'https://example.com'})).status,403);
let created=await api('/api/routines','POST',{id,title:'Synthetic daily item'}); assert.equal(created.status,201); assert.equal(created.data.routine.completed,false);
assert.equal((await api('/api/routines','POST',{id,title:'Synthetic daily item'})).data.routine.revision,1);
let checked=await api('/api/routines','PATCH',{id,revision:1,date:initial.data.date,completed:true}); assert.equal(checked.data.routine.completed,true);
assert.equal((await api('/api/routines','PATCH',{id,revision:1,date:initial.data.date,completed:false})).status,409);
assert.equal((await api('/api/routines','PATCH',{id,revision:2,date:'2000-01-01',completed:false})).status,409);
let afterCheck=(await api('/api/routines')).data; assert.equal(afterCheck.routines[0].completed,true); assert.equal(afterCheck.history.at(-1).count,baseCount+1);
let undone=await api('/api/routines','PATCH',{id,revision:2,date:initial.data.date,completed:false}); assert.equal(undone.data.routine.completed,false); assert.equal((await api('/api/routines')).data.history.at(-1).count,baseCount);
assert.equal((await api('/api/routines','DELETE',{id,revision:2})).status,409);
assert.equal((await api('/api/routines','DELETE',{id,revision:3})).status,200);
const rpc=async (method,params={}) => (await api('/mcp','POST',{jsonrpc:'2.0',id:1,method,params})).data;
const discover=await rpc('server/discover'); assert.ok(discover.result.supportedVersions.includes('2026-07-28'));
const init=await rpc('initialize',{protocolVersion:'2026-07-28',capabilities:{},clientInfo:{name:'local-test',version:'1'}}); assert.equal(init.result.protocolVersion,'2026-07-28');
const catalog=await rpc('tools/list'); for(const name of ['list_routines','create_routine','set_routine_completion','remove_routine']) assert.ok(catalog.result.tools.some(t=>t.name===name));
const mcpId=crypto.randomUUID();
let m=await rpc('tools/call',{name:'create_routine',arguments:{id:mcpId,title:'Synthetic MCP item'}});assert.equal(m.result.isError,false);
m=await rpc('tools/call',{name:'list_routines',arguments:{}});assert.equal(m.result.structuredContent.routines.length,1); const date=m.result.structuredContent.date;
m=await rpc('tools/call',{name:'set_routine_completion',arguments:{id:mcpId,revision:1,date,completed:true}});assert.equal(m.result.structuredContent.routine.completed,true);
m=await rpc('tools/call',{name:'remove_routine',arguments:{id:mcpId,revision:2}});assert.equal(m.result.structuredContent.removed,true);
let final=(await api('/api/routines')).data; assert.equal(final.routines.length,0); assert.equal(final.history.at(-1).count,baseCount+1); // removing the completed definition preserves history
console.log('PASS: anonymous access, ownership, CSRF, empty state, create/idempotency, persistence, completion/undo, stale date/revision, removal, MCP discovery and CRUD, completion history and undo');
