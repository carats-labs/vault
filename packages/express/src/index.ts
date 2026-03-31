import { findClosest } from '@carats/core'
import { Request, Response, Router } from 'express'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ViteDevServer } from 'vite'

export const router: Router = Router()
const loader = (path: string) => isProduction ? import(path) : vite.ssrLoadModule(path)

const isProduction = process.env.NODE_ENV === 'production'
const config = {
  base: process.env.BASE || '/',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000
  }
}

const _clientBaseDir = isProduction ? 'dist/client' : 'src/client'
const clientBase = findClosest(_clientBaseDir)
if (!clientBase) throw new Error('Can not find client base directory: ' + _clientBaseDir)

const _serverBaseDir = isProduction ? 'dist/server' : 'src/server'
const serverBase = findClosest(_serverBaseDir)

if (!serverBase) throw new Error('Can not find server base directory: ' + _serverBaseDir)

const templateHtml = isProduction
  ? readFileSync(join(clientBase, 'index.html'), 'utf-8')
  : ''

let vite: ViteDevServer
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    configFile: join(serverBase, '../..', 'vite.config.client.ts'),
  })
  Object.assign(config, vite.config)
  router.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  router.use(compression())
  router.use(config.base, sirv(clientBase, { extensions: [] }))
}

router.all('*splat', async (req: Request, res: Response) => {
  try {
    const { getServerProps, render } = (await loader(join(serverBase, 'entrypoint'))).default
    const url = req.originalUrl.replace(config.base, '/')
    const caratsRequest = {
      url,
      headers: req.headers as Record<string, string>,
      cookies: req.cookies,
      method: req.method,
      data: req.body,
    }
    
    if (url.startsWith('/culet/')) {
      const data = await getServerProps(caratsRequest)
      const { _status, ...payload } = data ?? { _status: 404, message: 'Not Found' }
      return res.status(_status || 200).json(payload)
    }

    let template = isProduction
      ? templateHtml
      : await vite.transformIndexHtml(url, readFileSync(join(clientBase, 'index.html'), 'utf-8'))

    const { head = '', html = '' } = await render(caratsRequest)

    const result = template
      .replace(`<!--app-head-->`, head)
      .replace(`<!--app-html-->`, html)

    res.status(200).set({ 'Content-Type': 'text/html' }).send(result)
  }
  catch (e) {
    if (e instanceof Error) {
      vite?.ssrFixStacktrace(e)
      console.error(e.stack)
      res.status(500).end(e.stack)
    } else {
      console.error(e)
      res.status(500).end(JSON.stringify(e))
    }
  }
})