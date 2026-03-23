import { transpile } from 'jjsx';
import { CaratsComponent, type getConfig } from '@carats/core';
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url';

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

type Fetcher<T> = (url: string) => Promise<T>;

interface CaratsClientSideAPI {
  getPageComponent: (path: string) => PageComponentResult;
  renderPage: <T = any>(url: string, fetcher: Fetcher<T>) => Promise<string>;
}

interface CaratsClientSideBuilderConfig {
  routes: Awaited<ReturnType<typeof getConfig>>['routes']
  suspense: Awaited<ReturnType<typeof getConfig>>['suspense']
}

export default function CaratsClientSideBuilder(config: CaratsClientSideBuilderConfig): CaratsClientSideAPI {
  function getPageComponent(path: string): PageComponentResult {
    const { routes, suspense } = config;

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

  async function renderPage<T = any>(url: string, fetcher: Fetcher<T>): Promise<string> {
    const { path, query } = parseUrl(url);
    const { component, params } = getPageComponent(path);
    const sspUrl = component.ssp ? replaceParams(component.ssp + qs(query), params) : null;
    const props = sspUrl ? await fetcher(sspUrl) : component.defaultProps || { url, params };
    return transpile(component(props));
  }

  return {
    getPageComponent,
    renderPage,
  };
}