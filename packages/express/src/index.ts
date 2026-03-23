import { Router } from 'express'
import { ViteDevServer } from 'vite'
import { findClosest, getConfig } from '@carats/core'
import fs from 'fs'

type CaratsRender = (url: string, req: any) => Promise<{
  html: string;
  head: string;
}>

const isProduction = process.env.NODE_ENV === 'production'
const {
  server: {
    basePath
  }
} = getConfig();

const router: Router = Router()

const templateHtml = isProduction
  ? fs.readFileSync('./dist/client/index.html', 'utf-8')
  : ''

async function getServerEntryAndTemplate(url: string) {
  if (isProduction) {
    const productionServerEntry = findClosest('dist/server/entrypoint.js')
    if (!productionServerEntry) {
      throw new Error('Production server entry not found')
    }
    const serverEntry = await import(productionServerEntry)
    return { serverEntry, template: templateHtml }
  } else {
    const localServerEntry = findClosest('src/server/entrypoint.ts')
    if (!localServerEntry) {
      throw new Error('Local server entry not found')
    }
    const serverEntry = await vite.ssrLoadModule(localServerEntry)
    const templateFile = findClosest('src/client/index.html')
    if (!templateFile) {
      throw new Error('Template file not found')
    }
    const templateContents = fs.readFileSync(templateFile, 'utf-8')
    const template = await vite.transformIndexHtml(url, templateContents)
    return { serverEntry, template }
  }
}

let vite: ViteDevServer
async function initVite() {
  if (!isProduction) {
    const { createServer } = await import('vite')
    vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
      base: basePath,
      root: './src/client',
      publicDir: './public',
    })
    router.use(vite.middlewares)
  } else {
    const compression = (await import('compression')).default
    const sirv = (await import('sirv')).default
    router.use(compression())
    router.use(basePath, sirv('./dist/client', { extensions: [] }))
  }
}

initVite()

router.use('/api*splat', async (req, res) => {
  try {
    const { serverEntry } = await getServerEntryAndTemplate(req.originalUrl)
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
    const url = req.originalUrl.replace(basePath, '/')

    const { serverEntry, template } = await getServerEntryAndTemplate(url)
    let render: CaratsRender
    if (!isProduction) {
      render = (await vite.ssrLoadModule(serverEntry)).render
    } else {
      render = (await import(serverEntry)).render
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
