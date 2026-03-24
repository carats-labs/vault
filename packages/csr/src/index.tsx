import { transpile } from 'jjsx';
import { CaratsComponent } from '@carats/core';
import { matchRoute, parseUrl, qs, replaceParams } from '@carats/url';
import { clearHydrations } from '@carats/hooks';

declare global {
  interface HTMLAnchorElement {
    _isHandled: boolean;
  }
}

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

type Fetcher<T> = (url: string) => Promise<T>;

interface CaratsClientSideAPI {
  getPageComponent: (path: string) => PageComponentResult;
  renderPage: <T = any>(url: string, fetcher: Fetcher<T>) => Promise<string>;
  clientRender: (url: string) => Promise<void>;
}

interface CaratsClientSideBuilderConfig {
  inAppRouting?: boolean;
  routes: Record<string, CaratsComponent>
  suspense: {
    loading: () => JSX.Element;
    error: (error: Error) => JSX.Element;
    notFound: () => JSX.Element;
  }
}

export default function CaratsClientSideBuilder(config: CaratsClientSideBuilderConfig): CaratsClientSideAPI {
  const { routes, suspense, inAppRouting = true } = config;
  const LoadingComponent = suspense.loading ?? (() => <>💎 Loading...</>);
  const ErrorComponent = suspense.error ?? ((error: Error) => <>💎 Error: {error.message}</>);
  const NotFoundComponent = suspense.notFound ?? (() => <>💎 Not Found</>);
  function getPageComponent(path: string): PageComponentResult {
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
                document.getElementById(suspenseId)?.replaceWith(transpile(ErrorComponent(error)));
              });
            return <div id={suspenseId}>{LoadingComponent()}</div>;
          };
          return { component: SuspenseComponent, params: matchedParams };
        }
        return { component: component, params: matchedParams };
      }
    }
    return { component: NotFoundComponent, params: {} };
  }

  async function renderPage<T = any>(url: string, fetcher: Fetcher<T>): Promise<string> {
    const { path, query } = parseUrl(url);
    const { component, params } = getPageComponent(path);
    const sspUrl = component.ssp ? replaceParams(component.ssp + qs(query), params) : null;
    const props = sspUrl ? await fetcher(sspUrl) : component.defaultProps || { url, params };
    return transpile(component(props));
  }

  async function clientRender(url: string) {
    // Show loading indicator if only page takes more than 250ms to load
    const loaderTimer = setTimeout(() => {
      document.getElementById("loading-indicator")?.classList.remove("hide");
    }, 250);
    await clearHydrations();
    try {
      const html = await renderPage(url, async (sspUrl) => await fetch(sspUrl).then(r => r.json()));
      document.getElementById("app")!.innerHTML = html;
    } catch (error) {
      document.getElementById("app")!.innerHTML = transpile(
        ErrorComponent(error as Error)
      );
    } finally {
      clearTimeout(loaderTimer);
      history.pushState(null, "", url);
      window.dispatchEvent(new Event("load"));
      document.getElementById("loading-indicator")?.classList.add("hide");
    }
  }

  if (inAppRouting) {
    window.addEventListener("load", () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a");
      anchors.forEach((anchor) => {
        if (anchor._isHandled) return;
        anchor.addEventListener("click", (event) => {
          const targetUrl = new URL(anchor.href);
          if (targetUrl.origin !== location.origin || anchor.download) return;
          event.preventDefault();
          clientRender(targetUrl.pathname + targetUrl.search);
        });
        anchor._isHandled = true;
      });
    })
  }

  return {
    getPageComponent,
    renderPage,
    clientRender,
  };
}