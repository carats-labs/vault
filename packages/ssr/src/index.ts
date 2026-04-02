import { CaratsRequest } from '@carats/core'
import { Facets, getPageComponent, PageComponentResult, renderPage } from '@carats/render'
import { parseUrl } from '@carats/url';
import { init, transpile } from 'jjsx'

export interface CaratsServerEntry {
  render: (req: CaratsRequest<never>) => Promise<{ html?: string; head?: string }>
  getServerProps: <T = any>(req: CaratsRequest<never>) => Promise<T> | T
  facets: Facets
  culets: Record<string, Culet>
}

export type CuletArgs = Omit<CaratsRequest, 'data'> & { params: Record<string, string> }
export type Culet<T = any> = ((request: CuletArgs) => T) & { __isCulet__?: true }

const culets: Record<string, Culet> = {}

export const seat = <T extends Culet>(f: T) => f;

export function culet<T = any>(culet: Culet<T>): Culet<T>
export function culet<T = any>(route: string, culet: Culet<T>): Culet<T>
export function culet<T = any>(routeOrCulet: string | Culet<T>, culet?: Culet<T>): Culet<T> {
  if (typeof routeOrCulet === 'string') {
    culets[routeOrCulet] = culet!
    culet!.__isCulet__ = true
    return culet!
  }
  if (!routeOrCulet.__isCulet__) {
    throw new Error('Invalid culet')
  }
  return routeOrCulet
}

export function defineServerEntry(facets: Facets): CaratsServerEntry {
  init()

  async function getServerProps(req: CaratsRequest<never>, pageComponentResult?: PageComponentResult) {
    const { component, params, route } = pageComponentResult || getPageComponent.call(facets, req.url.replace('/culet', ''))
    if (!culets[route]) return component.defaultProps
    return await culets[route]({ ...req, params })
  }

  async function render(req: CaratsRequest<never>) {
    const {
      suspense: {
        error: ErrorPage
      }
    } = facets
    const pcr = getPageComponent.call(facets, req.url)
    const { path } = parseUrl(req.url);
    const props = await getServerProps(req, pcr)
    const { component } = pcr
    let head = component.head || ''
    head += '\n' + `<script>window.ssp=${JSON.stringify({ for: path, data: props })}</script>`
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
    culets,
  }
}