import { CaratsRequest, Hallmark } from '@carats/core'
import { Facets, getPageComponent, renderPage } from '@carats/render'
import { init, transpile } from 'jjsx'

export interface CaratsServerEntry {
  render: (req: CaratsRequest) => Promise<{ html?: string; head?: string }>
}

type HallmarkArgs = Parameters<Hallmark['default']>[0]

export default function defineServerEntry(facets: Facets, hallmarks: Record<string, Hallmark>): CaratsServerEntry {
  init()

  async function render(req: CaratsRequest) {
    const {
      suspense: {
        error: ErrorPage
      }
    } = facets
    const { component, params } = getPageComponent.call(facets, req.url)
    const args: HallmarkArgs = { ...req, params }
    let props = component.defaultProps || args
    let head = ''
    const sspSidecar = Object.keys(hallmarks).find(h => h.endsWith(`${component.name}.api.ts`))
    if (sspSidecar) {
      const sspModule = hallmarks[sspSidecar];
      props = await sspModule.default(args);
      head = component.head || ''
      head += '\n' + `<script>window.ssp=${JSON.stringify({ for: component.name, data: props })}</script>`
      head = head.trim()
    }
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
  }
}