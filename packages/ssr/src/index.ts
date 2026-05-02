import { CaratsRequest } from '@carats/core';
import { Facets, getPageComponent, PageComponentResult, renderPage } from '@carats/render';
import { parseUrl } from '@carats/url';
import { init, transpile } from 'jjsx';

export interface CaratsServerEntry {
  render: (req: CaratsRequest<never>) => Promise<{ html?: string; head?: string }>
  getServerProps: <T = any>(req: CaratsRequest<never>) => Promise<T> | T
  facets: Facets
  culets: Record<string, Culet>
}

export type CuletArgs = Omit<CaratsRequest, 'data'> & { params: Record<string, string> }
export type Culet<T = any> = (request: CuletArgs) => T

const culets: Record<string, Culet> = {}

export const seat = <T extends Culet>(f: T) => f;

export function culet<T = any>(route: string, culet: Culet<T>): Culet<T> {
  culets[route] = culet
  return culet
}

export function defineServerEntry(facets: Facets): CaratsServerEntry {
  init()

  async function getServerProps(req: CaratsRequest<never>, pageComponentResult?: PageComponentResult) {
    const { component, params, route } = pageComponentResult || getPageComponent.call(facets, req.url.replace('/culet', ''))
    if (!culets[route]) return component.defaultProps
    return await culets[route]({ ...req, params })
  }

  async function render(req: CaratsRequest<never>) {
    const pageComponentResult = getPageComponent.call(facets, req.url)
    const { path } = parseUrl(req.url);
    const props = await getServerProps(req, pageComponentResult)
    const component = pageComponentResult.component
    const html = await renderPage.call(facets, component, props);
    let head = '$carats_state$carats_dynamic'
    const $carats_state = `<script>window.carats=${JSON.stringify({ ssp: { for: path, data: props } })}</script>`
    let $carats_dynamic = ''
    if (component.head) {
      $carats_dynamic = transpile(component.head)
    }
    head = head
      .replace('$carats_state', $carats_state)
      .replace('$carats_dynamic', $carats_dynamic)
    try {
      return {
        html,
        head
      }
    } catch (error) {
      const errorPage = facets.suspense.error
      return {
        html: transpile(errorPage(error as Error)),
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