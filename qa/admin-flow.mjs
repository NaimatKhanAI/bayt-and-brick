import {chromium} from 'playwright'
import {promises as fs} from 'node:fs'
import assert from 'node:assert/strict'
const base='http://127.0.0.1:3001', title='QA temporary upload verification'
const browser=await chromium.launch({headless:true,channel:'chrome'})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const media=[];let id
try{
  await page.goto(base+'/admin');await page.getByLabel('Username',{exact:true}).fill((await fs.readFile('.local/admin-access.txt','utf8')).match(/Username: (.+)/)[1]);await page.getByLabel('Password',{exact:true}).fill((await fs.readFile('.local/admin-access.txt','utf8')).match(/Password: (.+)/)[1]);await page.getByRole('button',{name:'Sign in securely'}).click();await page.getByRole('button',{name:'Add property'}).click()
  await page.getByLabel('Property title').fill(title);await page.getByLabel('Size (sq ft)').fill('750 sq ft');await page.getByLabel('Monthly rent (AED)').fill('4100');await page.getByLabel('Yearly rent (AED)').fill('46000');await page.getByLabel('Description').fill('Temporary property created by automated UI verification.')
  await page.locator('input[type=file]').setInputFiles(['public/assets/studio.webp','public/assets/studio-kitchen.webp']);await page.locator('.admin-media img').nth(1).waitFor();media.push(...await page.locator('.admin-media img').evaluateAll(images=>images.map(i=>new URL(i.src).pathname)));await page.getByRole('button',{name:'Save property',exact:true}).click();await page.getByRole('status').waitFor()
  const properties=await (await page.request.get(base+'/api/properties')).json();const property=properties.find(p=>p.name===title);assert(property);id=property.id;assert.equal(property.images.length,2)
  await page.locator('.admin-row').filter({hasText:title}).getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('button',{name:'Remove photo 2',exact:true}).click();await page.getByRole('button',{name:'Save property',exact:true}).click();await page.locator('.admin-row').filter({hasText:title}).waitFor()
  const updated=(await (await page.request.get(base+'/api/properties')).json()).find(p=>p.id===id);assert.equal(updated.images.length,1);assert.equal((await page.request.get(base+media[1])).status(),404)
  const publicPage=await browser.newPage();await publicPage.goto(base+'/property/'+id);await publicPage.getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await publicPage.locator('.thumbnails img').count(),1);await publicPage.close()
  await page.locator('.admin-row').filter({hasText:title}).getByRole('button',{name:'Delete '+title,exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete property',exact:true}).click();await page.locator('.admin-row').filter({hasText:title}).waitFor({state:'detached'});assert(!(await (await page.request.get(base+'/api/properties')).json()).some(p=>p.id===id));console.log('Admin UI passed: photo upload, property publishing, public visibility, photo removal and property deletion.')
}finally{
  if(id)await page.request.delete(base+'/api/properties/'+id).catch(()=>{})
  for(const url of media)await page.request.delete(base+'/api/media',{data:{url}}).catch(()=>{})
  await browser.close()
}

