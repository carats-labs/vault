import { transpile } from 'jjsx';
import { CaratsComponent, getConfig } from '@carats/core';
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url';

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

export function getPageComponent(path: string): PageComponentResult {
  const { routes, suspense } = getConfig();

  const publicRoutes = Object.fromEntries(Object.entries(routes).filter(([_, route]) => route.public));
  for (const routePath in publicRoutes) {
    const { component } = publicRoutes[routePath];
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
          return <div id={suspenseId}>{suspense.loading({ id: suspenseId })}</div>;
        };
        return { component: SuspenseComponent, params: matchedParams };
      }
      return { component: component, params: matchedParams };
    }
  }
  return { component: suspense.notFound, params: {} };
}

export async function renderPage(url: string, fetcher: (sspUrl: string) => Promise<any>): Promise<string> {
  const { path, query } = parseUrl(url);
  const { component, params } = getPageComponent(path);
  const sspUrl = component.ssp ? replaceParams(component.ssp + qs(query), params) : null;
  const props = sspUrl ? await fetcher(sspUrl) : component.defaultProps || { url, params };
  return transpile(component(props));
}
