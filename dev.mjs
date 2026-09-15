import { spawn } from 'node:child_process'
const server = spawn(process.execPath, ['server.mjs'], { stdio: 'inherit' })
const client = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' })
let closing = false
function close(code = 0) { if (closing) return; closing = true; server.kill(); client.kill(); process.exit(code) }
server.on('exit', code => close(code || 0)); client.on('exit', code => close(code || 0))
process.on('SIGINT', () => close()); process.on('SIGTERM', () => close())
