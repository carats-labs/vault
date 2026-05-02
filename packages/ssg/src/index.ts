#!/usr/bin/env bun
import { findClosest } from "@carats/core";
import { mkdirSync, writeFileSync } from "fs";
import { AddressInfo } from "net";
import { dirname, join } from "path";

async function main() {
  const appFile = findClosest('dist/app');
  if (!appFile) {
    console.error('Could not find app file (dist/app), please run build command first')
    process.exit(1)
  }
  const closestClientBuildDir = findClosest('dist/client');

  if (!closestClientBuildDir) {
    console.error('Could not find dist/client directory')
    process.exit(1)
  }

  const appModule = await import(appFile);
  const { server, segments: { facets } } = await appModule.default;
  const { port }: AddressInfo = server.address();
  const staticRoutes = Object
    .keys(facets.routes)
    .filter(p => !p.includes('/:'));

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