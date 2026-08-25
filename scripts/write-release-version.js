const fs = require('fs')
const path = require('path')

const packagePath = path.join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
const version = String(process.env.RELEASE_VERSION || '').trim().replace(/^v/, '')

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`无效的 RELEASE_VERSION：${process.env.RELEASE_VERSION || ''}`)
}

packageJson.version = version
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)
console.log(`桌面应用版本已设置为 ${version}`)
