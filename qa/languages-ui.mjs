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
  for (const language of ['ur','ar','ml','en']) {
    await page.goto(origin+'/')
    await page.locator('.language-selector').selectOption(language)
    assert.equal(await page.locator('html').getAttribute('lang'),language)
    assert.equal(await page.locator('html').getAttribute('dir'),['ur','ar'].includes(language)?'rtl':'ltr')
    if(language!=='en')assert.notEqual(await page.locator('main h1').innerText(),'Find a place to call home.')
    for(const width of [1440,375]){
      await page.setViewportSize({width,height:1000})
      for(const route of ['/','/properties','/property/studio-1','/about','/areas','/contact']) {
        await page.goto(origin+route)
        await page.locator('main h1').waitFor()
        assert.equal(await page.locator('.language-selector').inputValue(),language)
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,language+' '+route+' '+width+' overflow')
      }
    }
    await page.locator('input[name=name]').fill('Keep my draft')
    await page.locator('.language-selector').selectOption(language==='en'?'ar':'en')
    assert.equal(await page.locator('input[name=name]').inputValue(),'Keep my draft')
    console.log(language+' public routes, persistence, direction, draft retention and responsive checks passed')
  }
  assert.deepEqual(errors,[])
} catch(error) { console.error('Browser failure URL:',page?.url()); if(page){console.error((await page.locator('body').innerText()).slice(0,3000));await page.screenshot({path:'qa/access-failure.png'})}; throw error } finally {
  await browser?.close()
  if(child?.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done}
  assert(tmp.startsWith(path.join(os.tmpdir(),'bb-ui-test-')));await fs.rm(tmp,{recursive:true,force:true})
}
