import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const host = '127.0.0.1'
const port = Number(process.env.PORT ?? 4173)
const entry = '/tests/browser/lifecycle.html'
const url = `http://${host}:${port}${entry}`

const server = spawn(process.execPath, ['scripts/dev-server.mjs', entry], {
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
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
