import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'
const serverFile = fileURLToPath(new URL('../server.mjs', import.meta.url))
test('Rental API protects administration and persists property, media and enquiry changes', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-rental-test-'))
  const probe = net.createServer(); await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve)); const port = probe.address().port; await new Promise(resolve=>probe.close(resolve))
  const origin = 'http://127.0.0.1:'+port
  let child, cookie = ''
  async function start(){child=spawn(process.execPath,[serverFile],{cwd:tmp,env:{...process.env,PORT:String(port),ADMIN_PASSWORD:'OnlyForAutomatedTesting!42',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server did not start')),10000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve()});child.once('error',reject)})}
  async function stop(){if(child?.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done}}
  async function call(url,method='GET',body,authenticated=false){const r=await fetch(origin+'/api'+url,{method,headers:{'Content-Type':'application/json',...(authenticated?{Cookie:cookie}:{}),Origin:origin},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')}}
  try{
    await start()
    let r=await call('/properties');assert.equal(r.status,200);assert.equal(r.data.length,9);assert(r.data.every(p=>p.demo && p.yearlyPrice>0))
    for(const [url,method] of [['/properties','POST'],['/upload','POST'],['/enquiries','GET'],['/properties/studio-1','DELETE'],['/media','DELETE']])assert.equal((await call(url,method,method==='GET'?undefined:{})).status,401)
    assert.equal((await call('/login','POST',{username:'admin',password:'wrong'})).status,401)
    r=await call('/login','POST',{username:'admin',password:'OnlyForAutomatedTesting!42'});assert.equal(r.status,200);assert.match(r.cookie,/HttpOnly/);assert.match(r.cookie,/SameSite=Strict/);cookie=r.cookie.split(';')[0]
    assert.equal((await call('/session','GET',undefined,true)).data.authenticated,true)
    const cross=await fetch(origin+'/api/properties',{method:'POST',headers:{Cookie:cookie,Origin:'https://other.example','Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403)
    const badUpload=await fetch(origin+'/api/upload',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:'<script>alert(1)</script>'});assert.equal(badUpload.status,400)
    const photo=await fs.readFile(new URL('../public/assets/studio.webp',import.meta.url));const uploaded=await fetch(origin+'/api/upload',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:photo});assert.equal(uploaded.status,201);const media=await uploaded.json();assert.equal(media.video,false)
    const videoBytes=Buffer.from([26,69,223,163,...Array(60).fill(0)]), videoResponse=await fetch(origin+'/api/upload',{method:'POST',headers:{Cookie:cookie,Origin:origin},body:videoBytes});assert.equal(videoResponse.status,201);const video=await videoResponse.json();assert.equal(video.video,true)
    const range=await fetch(origin+video.url,{headers:{Range:'bytes=4-11'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 4-11/64');assert.equal((await range.arrayBuffer()).byteLength,8)
    assert.equal((await fetch(origin+video.url,{headers:{Range:'bytes=200-300'}})).status,416)
    const item={name:'QA isolated home',slug:'1-bhk',area:'Al Reem Island',location:'Al Reem Island, Abu Dhabi',price:4200,yearlyPrice:48000,size:'850 sq ft',images:[media.url],video:video.url,furnished:true,description:'Integration test'}
    r=await call('/properties','POST',item,true);assert.equal(r.status,200);const id=r.data.id;assert.equal(r.data.demo,false)
    assert.equal((await call('/media','DELETE',{url:media.url},true)).status,409)
    assert.equal((await call('/properties','POST',{...item,price:-1},true)).status,400)
    assert.equal((await call('/enquiries','POST',{name:'QA',phone:'bad',date:'2026-10-01'})).status,400)
    assert.equal((await call('/enquiries','POST',{name:'QA Test',phone:'+971501234567',date:'2026-10-01',property:id,message:'Viewing test'})).status,201)
    r=await call('/enquiries','GET',undefined,true);assert.equal(r.data.length,1);assert.equal(r.data[0].property,id)
    r=await call('/properties','POST',{...item,id,yearlyPrice:45000},true);assert.equal(r.data.yearlyPrice,45000)
    await stop();await start();r=await call('/properties');assert.equal(r.data.find(x=>x.id===id).yearlyPrice,45000);assert.equal((await call('/session','GET',undefined,true)).data.authenticated,false)
    r=await call('/login','POST',{username:'admin',password:'OnlyForAutomatedTesting!42'});cookie=r.cookie.split(';')[0]
    assert.equal((await call('/properties/'+id,'DELETE',undefined,true)).status,200)
    assert.equal((await call('/media','DELETE',{url:media.url},true)).status,200)
    assert.equal((await call('/media','DELETE',{url:video.url},true)).status,200)
    assert.equal((await fetch(origin+media.url)).status,404)
    assert.equal((await call('/logout','POST',undefined,true)).status,200)
    assert.equal((await call('/enquiries','GET',undefined,true)).status,401)
  }finally{await stop();assert(tmp.startsWith(path.join(os.tmpdir(),'bb-rental-test-')));await fs.rm(tmp,{recursive:true,force:true})}
})

