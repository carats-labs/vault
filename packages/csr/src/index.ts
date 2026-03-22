import { transpile } from 'jjsx';
import { readFileSync } from 'fs';
import { CaratsComponent } from '@carats/core';
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url';

interface PageComponentModule {
  default: CaratsComponent
}

const ROUTE_FILE = './_PUBLIC_ROUTES.env';
const ROUTES = readFileSync(ROUTE_FILE, 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .reduce<Record<string, Promise<CaratsComponent>>>((acc, l) => {
    const [route, pageComponentName] = l.split('=').map(s => s.trim());
    const component = import(`../client/pages/${pageComponentName}`) satisfies Promise<PageComponentModule>;
    acc[route] = component;
    return acc;
  }, {})

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

export async function getPageComponent(path: string): Promise<PageComponentResult> {
  for (const [routePath, component] of Object.entries(ROUTES)) {
    const matchedParams = matchRoute(routePath, path);
    if (matchedParams) {
      const c = await component;
      return { component: c, params: matchedParams };
    }
  }
  const { default: NotFound } = await import(`../client/pages/${'NotFound'}`) as { default: CaratsComponent };
  return { component: NotFound, params: {} };
}

export async function renderPage(url: string, fetcher: (sspUrl: string) => Promise<any>): Promise<string> {
  const { path, query } = parseUrl(url);
  const { component, params } = await getPageComponent(path);
  const sspUrl = component.ssp ? replaceParams(component.ssp + qs(query), params) : null;
  const props = sspUrl ? await fetcher(sspUrl) : component.defaultProps || { url, params };
  return transpile(component(props));
}
