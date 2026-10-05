import { matchRoute } from "@carats/url"

type CaratsFunction<T> = (this: CaratsComponent, ...args: T[]) => JSX.Element | Promise<JSX.Element>

export interface CaratsComponent<T = any> extends CaratsFunction<T> {
  defaultProps?: T
  head?: JSX.Element
  burnished?: boolean
  recast?: boolean
  frame?: () => JSX.Element
  status?: number
}

export type CaratsComponentWithThis<T = any> = ((this: CaratsComponent<T>, props: T) => JSX.Element) & CaratsComponent<T>

export interface Facets {
  inAppRouting?: boolean
  routes: Record<string, CaratsComponent>
  suspense: {
    loading: () => JSX.Element
    error: (error: Error) => JSX.Element
    notFound: CaratsComponent
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

export function Status<T = any>(status: number): (component: CaratsComponent<T>) => CaratsComponent<T>
export function Status<T = any>(status: number): (component: CaratsComponentWithThis<T>) => CaratsComponentWithThis<T>
export function Status(status: number) {
  return function <T extends CaratsComponent>(component: T) {
    component.status = status
    return component
  }
}