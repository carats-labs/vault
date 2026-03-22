import { mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join, resolve } from "path"

const ROUTE_FILE = './_STATIC_ROUTES.env'
const ROUTES = readFileSync(ROUTE_FILE, 'utf-8')
  .split('\n')
  .map((r) => r.trim())
  .filter(Boolean)
  .filter((r) => !r.startsWith('#'))

const ORIGIN = `http://localhost:${process.env.PORT}`
const targetDir = resolve(import.meta.dirname, '../../dist/client')

for (const path of ROUTES) {
  if (path.includes('/:')) continue
  console.log('Building page:', path)
  const response = await fetch(`${ORIGIN}${path}`)
  const html = await response.text()
  const targetBuildPath = join(targetDir, path, 'index.html')
  mkdirSync(dirname(targetBuildPath), { recursive: true })
  writeFileSync(targetBuildPath, html)
}

process.exit(0)