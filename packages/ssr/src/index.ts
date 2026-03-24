import { CaratsRequest, Hallmark } from '@carats/core'
import { Facets, getPageComponent, renderPage } from '@carats/render'
import { init, transpile } from 'jjsx'

export interface CaratsServerEntry {
  render: (req: CaratsRequest) => Promise<{ html?: string; head?: string }>
  getServerProps: <T = any>(req: CaratsRequest) => Promise<T> | T
  facets: Facets
  hallmarks: Record<string, HallmarkModule>
}

interface HallmarkModule {
  default: Hallmark
}

export default function defineServerEntry(facets: Facets, hallmarks: Record<string, HallmarkModule>): CaratsServerEntry {
  init()

  async function getServerProps(req: CaratsRequest) {
    const { component, params, hallmark } = getPageComponent.call(facets, req.url.replace('/api', ''))
    const hallmarkPath = Object.keys(hallmarks).find(h => h.endsWith(`${hallmark}.cara.ts`));
    if (!hallmarkPath) return component.defaultProps || { ...req, params };
    const sspModule = hallmarks[hallmarkPath];
    return await sspModule.default({ ...req, params });
  }

  async function render(req: CaratsRequest) {
    const {
      suspense: {
        error: ErrorPage
      }
    } = facets
    const { component, hallmark } = getPageComponent.call(facets, req.url)
    const props = await getServerProps(req)
    let head = component.head || ''
    head += '\n' + `<script>window.ssp=${JSON.stringify({ for: hallmark, data: props })}</script>`
    head = head.trim()
    const html = await renderPage.call(facets, component, props);
    try {
      return {
        html,
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
    render,
    getServerProps,
    facets,
    hallmarks
  }
}