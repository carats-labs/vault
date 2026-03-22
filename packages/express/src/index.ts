import { Router } from 'express'
import { ViteDevServer } from 'vite'
import fs from 'fs'

const isProduction = process.env.NODE_ENV === 'production'
const base = process.env.BASE || '/'

const router = Router()

const templateHtml = isProduction
  ? fs.readFileSync('./dist/client/index.html', 'utf-8')
  : ''

// Add Vite or respective production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite: ViteDevServer
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
    root: './src/client',
    publicDir: './public',
  })
  router.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  router.use(compression())
  router.use(base, sirv('./dist/client', { extensions: [] }))
}

router.use('/api*splat', async (req, res) => {
  try {
    const serverEntry = isProduction
      // @ts-ignore
      ? (await import('./dist/server/entrypoint.js'))
      : (await vite.ssrLoadModule('./src/server/entrypoint.ts'))
    const getApiData = serverEntry.getApiData
    const data = await getApiData(req.originalUrl, req)
    res.status(data._status || 200).json(
      Object.fromEntries(Object.keys(data)
        .filter(key => key !== '_status')
        .map(key => [key, data[key]]))
    )
  } catch (e: any) {
    console.error(e.message)
    console.error(e.stack)
    res.status(500).end(e.stack)
  }
})

// Serve HTML
router.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '/')

    /** @type {string} */
    let template
    /** @type {import('./src/server/entrypoint').render} */
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = fs.readFileSync('./src/client/index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('./src/server/entrypoint.ts')).render
    } else {
      template = templateHtml
      // @ts-ignore
      render = (await import('./dist/server/entrypoint.js')).render
    }

    const rendered = await render(url, req)

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

export default router
