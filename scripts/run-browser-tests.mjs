import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const host = '127.0.0.1'
const port = Number(process.env.PORT ?? 4173)
const entry = '/tests/browser/lifecycle.html'
const url = `http://${host}:${port}${entry}`

const server = spawn(process.execPath, ['scripts/dev-server.mjs'], {
  env: { ...process.env, HOST: host, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverOutput = ''
for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding('utf8')
  stream.on('data', chunk => { serverOutput += chunk })
}

let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Demo server exited: ${serverOutput}`)
    try {
      const response = await fetch(url)
      if (response.ok) { ready = true; break }
    } catch { /* server is starting */ }
    await delay(100)
  }
  if (!ready) throw new Error(`Demo server failed to start: ${serverOutput}`)

  // A directory without index.html must return 404, not return 200 then
  // crash the server from an unhandled createReadStream error.
  const directoryResponse = await fetch(`http://${host}:${port}/src/`)
  if (directoryResponse.status !== 404) {
    throw new Error(`Directory without index.html returned ${directoryResponse.status} instead of 404`)
  }
  const aliveResponse = await fetch(url)
  if (!aliveResponse.ok) throw new Error('Demo server crashed after directory request')

  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => document.body.dataset.status !== 'running', null, { timeout: 25_000 })
  const result = await page.locator('#result').textContent()
  const status = await page.locator('body').getAttribute('data-status')
  if (status !== 'pass' || errors.length) {
    throw new Error(`Browser lifecycle failed: ${result}\n${errors.join('\n')}`)
  }
  console.log('Browser lifecycle passed:', result)

  // Exercise the exact root document shipped to GitHub Pages, not merely the
  // gallery unit-test fixture. The dev server's root must resolve index.html.
  const demo = await browser.newPage()
  const demoErrors = []
  demo.on('pageerror', error => demoErrors.push(error.message))
  await demo.goto(`http://${host}:${port}/`, { waitUntil: 'domcontentloaded' })
  try {
    await demo.waitForFunction(() => document.body.dataset.status !== 'running', null, { timeout: 10_000 })
  } catch {
    throw new Error(`Root demo did not initialize: ${demoErrors.join('; ') || 'module import or parse failure'}`)
  }
  const demoStatus = await demo.locator('body').getAttribute('data-status')
  if (demoStatus !== 'pass') throw new Error('Demo failed to initialize')
  if (await demo.locator('.grid__item').count() !== 10) {
    throw new Error('Demo did not render ten keyboard-accessible preview buttons')
  }

  await demo.locator('#animation').selectOption('none')
  await demo.locator('[data-index="0"]').click()
  await demo.waitForSelector('.expose[role="dialog"]')
  await demo.waitForFunction(() => document.getElementById('log')?.textContent?.startsWith('Opened at #'))
  await demo.keyboard.press('ArrowRight')
  await demo.waitForFunction(
    () => document.querySelector('.expose__counter-num')?.textContent === '2',
    null, { timeout: 5_000 },
  )
  await demo.locator('.expose__toolbar-btn[aria-label="Close"]').click()
  await demo.waitForSelector('.expose', { state: 'detached' })

  await demo.locator('#preload').selectOption('0')
  await demo.locator('#optZoom').check()
  await demo.locator('#openAt3').click()
  await demo.waitForSelector('.expose')
  await demo.waitForFunction(() => document.getElementById('log')?.textContent?.startsWith('Opened at #'))
  await demo.locator('.expose__toolbar-btn[data-name="demo-add-slide"]').click()
  if (await demo.locator('.grid__item').count() !== 11) {
    throw new Error('Demo failed to add a slide')
  }
  await demo.locator('.expose__toolbar-btn[data-name="demo-remove-slide"]').click()
  if (await demo.locator('.grid__item').count() !== 10) {
    throw new Error('Demo failed to remove the current slide')
  }
  await demo.locator('.expose__toolbar-btn[aria-label="Close"]').click()
  await demo.waitForSelector('.expose', { state: 'detached' })
  await demo.locator('#destroyGallery').click()
  if (demoErrors.length) throw new Error(`Demo script errors: ${demoErrors.join('; ')}`)
  console.log('Root demo smoke passed: previews, keyboard navigation, dynamic slides and teardown')
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
