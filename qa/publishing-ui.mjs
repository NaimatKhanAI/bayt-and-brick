import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import assert from 'node:assert/strict'
const root = process.cwd(), tmp = await fs.mkdtemp(path.join(os.tmpdir(),'bb-ui-test-'))
let child, browser, page
try {
  await fs.cp(path.join(root,'dist'),path.join(tmp,'dist'),{recursive:true})
  child = spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:tmp,env:{...process.env,PORT:'0',HOST:'127.0.0.1',ADMIN_USERNAME:'qa-owner',ADMIN_PASSWORD:'QaOwnerPassword!42',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']})
  const origin = await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);child.stdout.once('data',data=>{clearTimeout(timer);resolve(data.toString().trim().match(/http:\/\/[^ ]+/)[0].replace('localhost','127.0.0.1'))});child.once('error',reject)})
  browser = await chromium.launch({channel:'msedge',headless:true})
  page = await browser.newPage({viewport:{width:1440,height:1000}}); const errors=[]
  page.setDefaultTimeout(20000)
  page.on('pageerror',error=>{errors.push(error.message);console.log('Page error:',error.message)})

  await page.route('https://**/*',route=>route.abort())
  await page.goto(origin+'/admin')
  await page.getByLabel('Username',{exact:true}).fill('qa-owner')
  await page.getByLabel('Password',{exact:true}).fill('QaOwnerPassword!42')
  await page.getByRole('button',{name:'Sign in securely'}).click()
  const row=page.locator('.admin-row').filter({hasText:'Furnished studio near University City'})
  await row.getByRole('button',{name:'Edit',exact:true}).click()
  await page.getByLabel('Show Call button (0543592223)',{exact:true}).uncheck()
  await page.getByLabel('Show WhatsApp button (0509794499)',{exact:true}).uncheck()
  await page.getByRole('button',{name:'Save property',exact:true}).click()
  await page.getByText('Property saved.',{exact:true}).waitFor()
  await row.getByRole('button',{name:'Hide Furnished studio near University City',exact:true}).click()
  await page.getByText('Property hidden from the website.',{exact:true}).waitFor()
  await page.reload()
  await row.getByRole('button',{name:'Unhide Furnished studio near University City',exact:true}).waitFor()
  assert(!(await (await page.request.get(origin+'/api/properties')).json()).some(p=>p.id==='studio-1'))
  await page.goto(origin+'/property/studio-1')
  assert.equal(await page.locator('.detail-title').count(),0)
  await page.goto(origin+'/admin')
  await row.getByRole('button',{name:'Unhide Furnished studio near University City',exact:true}).click()
  await page.getByText('Property is visible on the website.',{exact:true}).waitFor()
  await page.goto(origin+'/property/studio-1')
  await page.locator('.detail-title').waitFor()
  assert.equal(await page.locator('.booking-card .property-contact-buttons').count(),0)
  assert.equal(await page.locator('.contact-action-dock a').count(),2)
  const properties=await (await page.request.get(origin+'/api/properties')).json()
  const created=await (await page.request.post(origin+'/api/properties',{data:{...properties.find(p=>p.id==='studio-1'),id:undefined,name:'New control test',hidden:false,showCallButton:true,showWhatsappButton:true}})).json()
  await page.goto(origin+'/property/'+created.id)
  await page.locator('.detail-title').waitFor()
  assert.equal(await page.locator('.booking-card .property-contact-buttons a').count(),2)
  await page.goto(origin+'/admin')
  const newRow=page.locator('.admin-row').filter({hasText:'New control test'})
  await newRow.getByRole('button',{name:'Hide New control test',exact:true}).waitFor()
  await newRow.getByRole('button',{name:'Delete New control test',exact:true}).waitFor()
  await page.request.post(origin+'/api/users',{data:{name:'Manager',username:'ui-manager',password:'ManagerPassword!42',roleId:'manager',active:true}})
  await page.getByRole('button',{name:'Sign out',exact:true}).click()
  await page.getByLabel('Username',{exact:true}).fill('ui-manager')
  await page.getByLabel('Password',{exact:true}).fill('ManagerPassword!42')
  await page.getByRole('button',{name:'Sign in securely'}).click()
  await newRow.getByRole('button',{name:'Edit',exact:true}).waitFor()
  assert.equal(await page.locator('.admin-row .delete-btn').count(),0)
  assert.equal(await page.locator('.admin-row .visibility-button').count(),0)
  await newRow.getByRole('button',{name:'Edit',exact:true}).click()
  assert.equal(await page.getByLabel('Hide this property from the website',{exact:true}).count(),0)
  await page.getByLabel('Show Call button (0543592223)',{exact:true}).waitFor()
  console.log('Per-property contacts, owner hide/unhide, new property controls, manager restrictions and unchanged floating contacts passed')
  assert.deepEqual(errors,[])
} catch(error) { console.error('Browser failure URL:',page?.url()); if(page){console.error((await page.locator('body').innerText()).slice(0,3000));await page.screenshot({path:'qa/access-failure.png'})}; throw error } finally {
  await browser?.close()
  if(child?.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done}
  assert(tmp.startsWith(path.join(os.tmpdir(),'bb-ui-test-')));await fs.rm(tmp,{recursive:true,force:true})
}
