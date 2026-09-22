import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { availableBy, isValidDate } from '../src/availability.js'
const serverFile = fileURLToPath(new URL('../server.mjs', import.meta.url))

test('availability includes matching dates, excludes unknown dates and rejects invalid calendar dates', () => {
  assert(availableBy({ availableFrom: '2026-10-01' }, '2026-10-01'))
  assert(availableBy({ availableFrom: '2026-10-01' }, '2026-10-02'))
  assert(!availableBy({ availableFrom: '2026-10-02' }, '2026-10-01'))
  assert(!availableBy({}, '2026-10-01'))
  assert(availableBy({}, ''))
  assert(!isValidDate('2026-02-30'))
  assert(!isValidDate('not-a-date'))
})

test('roles enforce API access, deactivation revokes sessions, audit preserves changes and credentials stay private', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-access-test-'))
  let child, origin, ownerCookie, editorCookie
  const password = 'TestPassword!42'
  async function start() {
    child = spawn(process.execPath, [serverFile], { cwd: tmp, env: { ...process.env, PORT: '0', HOST: '127.0.0.1', ADMIN_USERNAME: 'owner', ADMIN_PASSWORD: password, NODE_ENV: 'test' }, stdio: ['ignore','pipe','pipe'] })
    await new Promise((resolve,reject) => { const timeout = setTimeout(()=>reject(new Error('Server startup timed out')),10000); child.stdout.once('data', data => { clearTimeout(timeout); origin = data.toString().trim().match(/http:\/\/[^ ]+/)[0]; resolve() }); child.once('error',reject); child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Server exited '+code))}) })
  }
  async function stop() { if (child?.exitCode === null) { const done = new Promise(resolve=>child.once('exit',resolve)); child.kill(); await done } }
  async function call(url, method='GET', body, cookie=ownerCookie) {
    const response = await fetch(origin+'/api'+url,{method,headers:{'Content-Type':'application/json', Origin:origin,...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)})
    return { status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0] }
  }
  try {
    await start()
    ownerCookie = (await call('/login','POST',{username:'owner',password},'')).cookie
    assert(ownerCookie)
    const original = (await call('/properties')).data[0]
    let result = await call('/users','POST',{name:'Editor One',username:'editor.one',password,roleId:'editor',active:true})
    assert.equal(result.status,200); const userId = result.data.id
    assert(!('hash' in result.data)); assert(!('salt' in result.data))
    assert.equal((await call('/users','POST',{name:'Duplicate',username:'EDITOR.ONE',password,roleId:'editor'})).status,409)
    editorCookie = (await call('/login','POST',{username:'editor.one',password},'')).cookie
    assert.equal((await call('/session','GET',undefined,editorCookie)).data.user.roleName,'Property editor')
    for (const endpoint of ['/users','/roles','/activity','/enquiries']) assert.equal((await call(endpoint,'GET',undefined,editorCookie)).status,403)
    assert.equal((await call('/roles','POST',{name:'Escalated',permissions:['users.manage']},editorCookie)).status,403)
    const property = {...original,id:undefined,name:'Eight bedroom test home',slug:'8-bhk',availableFrom:'2026-10-01',bathrooms:5}
    result = await call('/properties','POST',property,editorCookie); assert.equal(result.status,200); const propertyId = result.data.id
    assert.equal(result.data.category,'8 BHK'); assert.equal(result.data.availableFrom,'2026-10-01'); assert.equal(result.data.bathrooms,5)
    assert.equal((await call('/properties','POST',{...property,availableFrom:'2026-02-30'},editorCookie)).status,400)
    assert.equal((await call('/properties','POST',{...property,slug:'9-bhk'},editorCookie)).status,400)
    for (const n of [3,4,5,6,7]) {
      const item = await call('/properties','POST',{...property,slug:n+'-bhk'},editorCookie)
      assert.equal(item.status,200); assert.equal(item.data.category,n+' BHK')
    }
    assert.equal((await call('/properties/'+propertyId,'DELETE',undefined,editorCookie)).status,403)
    result = await call('/properties','POST',{...property,id:propertyId,name:'Updated eight bedroom home'},editorCookie); assert.equal(result.status,200)
    // Visibility must be enforced at the API, and normal edits must preserve it.
    assert.equal((await call('/properties/'+propertyId+'/visibility','POST',{hidden:true},editorCookie)).status,403)
    assert.equal((await call('/properties/'+propertyId+'/visibility','POST',{hidden:true})).status,200)
    assert(!(await call('/properties','GET',undefined,'')).data.some(p=>p.id===propertyId))
    assert((await call('/admin/properties')).data.some(p=>p.id===propertyId&&p.hidden))
    assert.equal((await call('/admin/properties','GET',undefined,'')).status,401)
    assert.equal((await call('/properties','POST',{...property,id:propertyId,hidden:false},editorCookie)).status,403)
    result=await call('/properties','POST',{...property,id:propertyId,name:'Updated eight bedroom home',showCallButton:false,showWhatsappButton:true},editorCookie)
    assert.equal(result.status,200);assert.equal(result.data.hidden,true);assert.equal(result.data.showCallButton,false);assert.equal(result.data.showWhatsappButton,true)
    assert.equal((await call('/properties','POST',{...property,id:propertyId,showCallButton:'false'},editorCookie)).status,400)
    assert.equal((await call('/properties/'+propertyId+'/visibility','POST',{hidden:false})).status,200)
    assert((await call('/properties','GET',undefined,'')).data.some(p=>p.id===propertyId))
    assert.equal((await call('/roles','POST',{name:'Cannot delegate deletion',permissions:['properties.delete']})).status,400)
    await call('/users','POST',{name:'Manager',username:'manager.test',password,roleId:'manager',active:true})
    const managerCookie=(await call('/login','POST',{username:'manager.test',password},'')).cookie
    assert(managerCookie)
    assert.equal((await call('/properties/'+propertyId,'DELETE',undefined,managerCookie)).status,403)
    assert.equal((await call('/properties/'+propertyId+'/visibility','POST',{hidden:true},managerCookie)).status,403)
    const visibilityEvents=(await call('/activity')).data.filter(e=>e.entityId===propertyId)
    assert(visibilityEvents.some(e=>e.action==='hide'&&e.after.hidden===true))
    assert(visibilityEvents.some(e=>e.action==='unhide'&&e.after.hidden===false))
    assert.equal((await call('/properties/'+propertyId,'DELETE')).status,200)
    let events = (await call('/activity')).data
    const created = events.find(e=>e.entityId===propertyId&&e.action==='create')
    assert.equal(created.actor,'editor.one'); assert.equal(created.after.slug,'8-bhk')
    const updated = events.find(e=>e.entityId===propertyId&&e.action==='update'&&e.before.name===property.name)
    assert.equal(updated.before.name,property.name); assert.equal(updated.after.name,'Updated eight bedroom home')
    assert.equal(events.find(e=>e.entityId===propertyId&&e.action==='delete').before.name,'Updated eight bedroom home')
    assert(!JSON.stringify(events).includes(password)); assert(!JSON.stringify(events).includes('"hash"')); assert(!JSON.stringify(events).includes('"salt"'))
    result = await call('/roles','POST',{name:'Add only',permissions:['properties.create']}); const roleId = result.data.id
    assert.equal((await call('/users','POST',{id:userId,name:'Editor One',username:'editor.one',roleId,active:true})).status,200)
    assert.equal((await call('/session','GET',undefined,editorCookie)).data.authenticated,false)
    editorCookie = (await call('/login','POST',{username:'editor.one',password},'')).cookie
    assert.equal((await call('/properties','POST',{...original,name:'Unauthorized edit'},editorCookie)).status,403)
    assert.equal((await call('/roles/'+roleId,'DELETE')).status,409)
    assert.equal((await call('/roles','POST',{id:roleId,name:'Add only',permissions:[]})).status,200)
    assert.equal((await call('/session','GET',undefined,editorCookie)).data.authenticated,false)
    editorCookie = (await call('/login','POST',{username:'editor.one',password},'')).cookie
    assert.equal((await call('/properties','POST',property,editorCookie)).status,403)
    assert.equal((await call('/users','POST',{id:userId,name:'Editor One',username:'editor.one',roleId,active:true,password:'ResetPassword!43'})).status,200)
    assert.equal((await call('/session','GET',undefined,editorCookie)).data.authenticated,false)
    assert.equal((await call('/login','POST',{username:'editor.one',password},'')).status,401)
    editorCookie = (await call('/login','POST',{username:'editor.one',password:'ResetPassword!43'},'')).cookie
    assert(editorCookie)
    assert.equal((await call('/users','POST',{id:userId,name:'Editor One',username:'editor.one',roleId,active:false})).status,200)
    assert.equal((await call('/session','GET',undefined,editorCookie)).data.authenticated,false)
    assert.equal((await call('/login','POST',{username:'editor.one',password},'')).status,401)
    assert.equal((await call('/users','POST',{id:'owner',name:'Owner',username:'owner',roleId,active:false})).status,400)
    assert.equal((await call('/roles','POST',{name:'Bad permission',permissions:['root']})).status,400)
    await call('/properties/'+original.id+'/visibility','POST',{hidden:true})
    await stop(); await start()
    ownerCookie = (await call('/login','POST',{username:'owner',password},'')).cookie
    assert(!(await call('/properties','GET',undefined,'')).data.some(p=>p.id===original.id))
    assert((await call('/admin/properties')).data.some(p=>p.id===original.id&&p.hidden))
    assert((await call('/activity')).data.some(e=>e.entityId===propertyId&&e.action==='delete'))
    assert.equal((await call('/users')).data.find(u=>u.id===userId).active,false)
    assert.equal((await call('/roles')).data.roles.find(r=>r.id===roleId).name,'Add only')
  } finally { await stop(); assert(tmp.startsWith(path.join(os.tmpdir(),'bb-access-test-'))); await fs.rm(tmp,{recursive:true,force:true}) }
})
