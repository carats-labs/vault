import { matchRoute } from "@carats/url"
import { transpile } from "jjsx"

type CaratsFunction<T> = (this: CaratsComponent, ...args: T[]) => JSX.Element | Promise<JSX.Element>

export interface CaratsComponent<T = any> extends CaratsFunction<T> {
  defaultProps?: T
  head?: JSX.Element
  burnished?: boolean
  recast?: boolean
}

export type CaratsComponentWithThis<T = any> = ((this: CaratsComponent<T>, props: T) => JSX.Element) & CaratsComponent<T>

export interface Facets {
  inAppRouting?: boolean
  routes: Record<string, CaratsComponent>
  suspense: {
    loading: () => JSX.Element
    error: (error: Error) => JSX.Element
    notFound: () => JSX.Element
  }
}

interface PartialFacets {
  inAppRouting?: boolean
  routes?: Record<string, CaratsComponent>
  suspense?: Partial<Facets['suspense']>
}

export function defineFacets(facets: PartialFacets): Facets {
  return {
    inAppRouting: facets.inAppRouting ?? true,
    routes: facets.routes ?? {},
    suspense: {
      loading: facets.suspense?.loading ?? (() => <>💎 Loading...</>),
      error: facets.suspense?.error ?? ((error: Error) => <>💎 Error: {error.message}</>),
      notFound: facets.suspense?.notFound ?? (() => <>💎 Not Found</>)
    }
  }
}

export interface PageComponentResult {
  component: CaratsComponent<any>
  params: Record<string, string>
  route: string
}

export function getPageComponent(this: Facets, url: string): PageComponentResult {
  const { routes, suspense } = this
  const path = new URL(url, 'http://localhost').pathname

  for (const routePath in routes) {
    const matchedParams = matchRoute(routePath, path)
    if (matchedParams) {
      return {
        component: routes[routePath],
        params: matchedParams,
        route: routePath
      }
    }
  }
  return { component: suspense.notFound, params: {}, route: '/not-found' }
}

export async function renderPage<T = any>(this: Facets, component: CaratsComponent<T>, props: T): Promise<string> {
  const element = await component.call(component, props);
  return transpile(element);
}

interface BurnishOptions {
  recast?: boolean
}

export function Burnish<T = any>(component: CaratsComponentWithThis<T>, options?: BurnishOptions): CaratsComponentWithThis<T>
export function Burnish<T = any>(component: CaratsComponent<T>, options?: BurnishOptions): CaratsComponent<T>
export function Burnish<T = any>(component: CaratsComponent<T>, options?: BurnishOptions): CaratsComponent<T> {
  component.burnished = true
  if (options?.recast) {
    component.recast = true
  }
  return component
}