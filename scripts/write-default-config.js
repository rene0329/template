const fs = require('fs')
const path = require('path')

const target = path.join(__dirname, '..', 'electron', 'default-config.json')
const current = JSON.parse(fs.readFileSync(target, 'utf8'))
const backendUrl = String(process.env.DEFAULT_BACKEND_URL || current.backendUrl || '').trim()

if (!/^https?:\/\//i.test(backendUrl)) {
  throw new Error('DEFAULT_BACKEND_URL 必须以 http:// 或 https:// 开头')
}

fs.writeFileSync(target, `${JSON.stringify({
  ...current,
  backendUrl: backendUrl.replace(/\/+$/, '')
}, null, 2)}\n`)

console.log(`默认后端地址已设置为 ${backendUrl}`)
