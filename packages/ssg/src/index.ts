#!/usr/bin/env bun
import { findClosest } from "@carats/core";
import { Facets } from "@carats/render";
import { mkdirSync, writeFileSync } from "fs";
import { AddressInfo } from "net";
import { dirname, join } from "path";

async function main() {
  const facetsFile = findClosest('src/client/facets.cara.ts');
  if (!facetsFile) {
    console.error('Could not find facets file (src/client/facets.cara.ts)')
    process.exit(1)
  }
  const appFile = findClosest('src/app.ts');
  if (!appFile) {
    console.error('Could not find app file (src/app.ts)')
    process.exit(1)
  }
  const closestClientBuildDir = findClosest('dist/client');

  if (!closestClientBuildDir) {
    console.error('Could not find dist/client directory')
    process.exit(1)
  }

  const facetsModule = await import(facetsFile);
  const facets = facetsModule.default as Facets;
  const staticRoutes = Object
    .keys(facets.routes)
    .filter(p => !p.includes('/:'));

  const appModule = await import(appFile);
  const { server: app } = await appModule.default;
  const { port }: AddressInfo = app.address() as AddressInfo;

  const ORIGIN = `http://localhost:${port}`

  for (const path of staticRoutes) {
    console.log('Building page:', path)
    const response = await fetch(`${ORIGIN}${path}`)
    const html = await response.text()
    const targetBuildPath = join(closestClientBuildDir, path, 'index.html')
    mkdirSync(dirname(targetBuildPath), { recursive: true })
    writeFileSync(targetBuildPath, html)
  }

  process.exit(0)
}

main();