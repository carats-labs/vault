import { matchRoute } from "@carats/url";
import { transpile } from "jjsx";

export interface CaratsComponent<T = any> extends JSX.FunctionComponent<T> {
  ssp?: string
  defaultProps?: T
  head?: string
}

export interface Facets {
  inAppRouting?: boolean;
  routes: {
    [key: string]: {
      component: CaratsComponent;
      hallmark?: string
    }
  }
  suspense: {
    loading: () => JSX.Element;
    error: (error: Error) => JSX.Element;
    notFound: () => JSX.Element;
  }
}

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
  hallmark?: string;
}

export function getPageComponent(this: Facets, path: string): PageComponentResult {

  const { routes, suspense } = this;


  for (const routePath in routes) {
    const { component, hallmark } = routes[routePath];
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
        return { component: SuspenseComponent, params: matchedParams, hallmark };
      }
      return { component: component, params: matchedParams, hallmark };
    }
  }
  return { component: suspense.notFound, params: {} };
}

export async function renderPage<T = any>(this: Facets, component: CaratsComponent<T>, props: T): Promise<string> {
  return transpile(component(props));
}