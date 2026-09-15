import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('https://share.google/UbzXJ8T4NEN5mdEwY', { waitUntil: 'domcontentloaded', timeout: 45_000 })
await page.waitForTimeout(4_000)
const links = await page.locator('a').evaluateAll(items => items.map(link => ({ text: link.textContent?.trim(), href: link.href })).filter(item => item.href))
console.log(JSON.stringify({ url: page.url(), title: await page.title(), links: links.slice(0, 30) }, null, 2))
await page.screenshot({ path: 'qa/shared-source.png', fullPage: true })
await browser.close()
