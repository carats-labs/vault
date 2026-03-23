import { findClosest, getConfig } from '@carats/core';
import { Router, Request } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ViteDevServer } from 'vite';

export const router : Router = Router();
const loader = (path: string) => isProduction ? import(path) : vite.ssrLoadModule(path);
type CaratsRender = (url: string, req: Request) => Promise<{
  html?: string;
  head?: string;
}>

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const {
  server: {
    basePath
  }
} = getConfig()

const _clientBaseDir = isProduction ? 'dist/client' : 'src/client';
const clientBase = findClosest(_clientBaseDir);
if (!clientBase) throw new Error('Can not find client base directory: ' + _clientBaseDir);

const _serverBaseDir = isProduction ? 'dist/server' : 'src/server';
const serverBase = findClosest(_serverBaseDir);

if (!serverBase) throw new Error('Can not find server base directory: ' + _serverBaseDir);

// Cached production assets
const templateHtml = isProduction
  ? readFileSync(join(clientBase, 'index.html'), 'utf-8')
  : ''

// Add Vite or respective production middlewares
let vite: ViteDevServer
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base: basePath,
    root: clientBase,
    publicDir: join(clientBase, '../../', 'public'),
  })
  router.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  router.use(compression())
  router.use(basePath, sirv(clientBase, { extensions: [] }))
}

router.use('/api*splat', async (req, res) => {
  try {
    const serverEntry = await loader(join(serverBase, 'entrypoint'))

    const getApiData = serverEntry.getApiData;
    const data = await getApiData(req.originalUrl, req);
    res.status(data._status || 200).json(
      Object.fromEntries(Object.keys(data)
        .filter(key => key !== '_status')
        .map(key => [key, data[key]]))
    );
  } catch (e: any) {
    console.error(e.message)
    console.error(e.stack)
    res.status(500).end(e.stack)
  }
})

// Serve HTML
router.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl.replace(basePath, '/');

    let template: string
    const render: CaratsRender = (await loader(join(serverBase, 'entrypoint'))).render;
    if (!isProduction) {
      template = readFileSync(join(clientBase, 'index.html'), 'utf-8')
      template = await vite.transformIndexHtml(url, template)
    } else {
      template = templateHtml
    }

    const rendered = await render(url, req);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? '')
      .replace(`<!--app-html-->`, rendered.html ?? '')

    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (e: any) {
    vite?.ssrFixStacktrace(e)
    console.error(e.stack)
    res.status(500).end(e.stack)
  }
})