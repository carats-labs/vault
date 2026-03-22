import { transpile } from 'jjsx';
import { readFileSync } from 'fs';
import { CaratsComponent, getConfig } from '@carats/core';
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url';

interface PageComponentModule {
  default: CaratsComponent
}

const {
  routes
} = await getConfig();

const publicRoutes = Object.fromEntries(Object.entries(routes).filter(([_, route]) => route.public));

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

export async function getPageComponent(path: string): Promise<PageComponentResult> {
  for (const routePath in publicRoutes) {
    const { component } = publicRoutes[routePath];
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
