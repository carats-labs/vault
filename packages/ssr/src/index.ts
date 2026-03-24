import { CaratsRequest, Hallmark } from '@carats/core'
import { getPageComponent, renderPage, Facets } from '@carats/render'
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url'
import { init, transpile } from 'jjsx'

export interface CaratsServerEntry {
  getApiData: <T = any>(req: CaratsRequest) => Promise<T>
  render: (req: CaratsRequest) => Promise<{ html?: string; head?: string }>
}

export default function defineServerEntry(facets: Facets, hallmarks: Record<string, Hallmark>): CaratsServerEntry {
  init()
  async function getApiData(req: CaratsRequest) {
    const { path } = parseUrl(req.url)
    for (const [routePath, hallmark] of Object.entries(hallmarks)) {
      const matchedParams = matchRoute(routePath, path)
      if (matchedParams) {
        return await hallmark({
          params: matchedParams,
          url: req.url,
          cookies: req.cookies,
          headers: req.headers,
          method: req.method,
          data: req.data
        })
      }
    }
    return { _status: 404, error: 'API endpoint not found' }
  }

  async function render(req: CaratsRequest) {
    const {
      suspense: {
        error: ErrorPage
      }
    } = facets
    const { query } = parseUrl(req.url)
    const { component, params } = getPageComponent.call(facets, req.url)
    let props = component.defaultProps || { url: req.url, params }
    let head = ''
    if (component.ssp) {
      const sspUrl = replaceParams(component.ssp + qs(query), params)
      props = await getApiData(req)
      head = props.head || ''
      head += '\n' + `<script>window.ssp=${JSON.stringify({ for: sspUrl, data: props })}</script>`
    }
    try {
      return {
        html: await renderPage.call(facets, component, props),
        head
      }
    } catch (error) {
      return {
        html: transpile(ErrorPage(error as Error)),
        head
      }
    }
  }

  return {
    getApiData,
    render
  }
}