import { matchRoute } from "@carats/url";
import { transpile } from "jjsx";

export interface CaratsComponent<T = any> extends JSX.FunctionComponent<T> {
  defaultProps?: T
  head?: string
  burnished?: boolean
  recast?: boolean
}

export interface Facets {
  inAppRouting?: boolean;
  routes: {
    [key: string]: CaratsComponent;
  }
  suspense: {
    loading: () => JSX.Element;
    error: (error: Error) => JSX.Element;
    notFound: () => JSX.Element;
  }
}

export interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
  route: string;
}

export function getPageComponent(this: Facets, url: string): PageComponentResult {
  const { routes, suspense } = this;
  const path = new URL(url, 'http://localhost').pathname;

  for (const routePath in routes) {
    const component = routes[routePath];
    const matchedParams = matchRoute(routePath, path);
    if (matchedParams) {
      if (component instanceof Promise) {
        const SuspenseComponent = () => {
          const suspenseId = `carats-suspense-${routePath}`;
          component
            .then((e: JSX.Element) => {
              document.getElementById(suspenseId)?.replaceWith(transpile(e));
            })
            .catch((error: Error) => {
              document.getElementById(suspenseId)?.replaceWith(transpile(suspense.error(error)));
            });
          return <div id={suspenseId}>{suspense.loading()}</div>;
        };
        return { component: SuspenseComponent, params: matchedParams, route: routePath };
      }
      return { component: component, params: matchedParams, route: routePath };
    }
  }
  return { component: suspense.notFound, params: {}, route: '/not-found' };
}

export async function renderPage<T = any>(this: Facets, component: CaratsComponent<T>, props: T): Promise<string> {
  return transpile(component(props));
}

interface BurnishOptions {
  recast?: boolean;
}

export function Burnish<T = any>(component: CaratsComponent<T>, options?: BurnishOptions): CaratsComponent<T> {
  component.burnished = true;
  if (options?.recast) {
    component.recast = true;
  }
  return component;
}