import { findClosest, getConfig } from "@carats/core";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

async function main() {
  const {
    routes,
    server
  } = getConfig()
  const staticRoutes = Object
    .keys(routes)
    .filter(p => [undefined, true].includes(routes[p].static))
    .filter(p => !p.includes('/:'));

  const ORIGIN = `${server.localOrigin}:${server.port}`
  const closestClientDir = findClosest('dist/client');

  if (!closestClientDir) {
    console.error('Could not find dist/client directory')
    process.exit(1)
  }

  for (const path of staticRoutes) {
    console.log('Building page:', path)
    const response = await fetch(`${ORIGIN}${path}`)
    const html = await response.text()
    const targetBuildPath = join(closestClientDir, path, 'index.html')
    mkdirSync(dirname(targetBuildPath), { recursive: true })
    writeFileSync(targetBuildPath, html)
  }

  process.exit(0)
}

main();