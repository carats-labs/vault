import { matchRoute, parseUrl, qs, replaceParams } from "@carats/url";
import { existsSync } from "fs";
import { transpile } from "jjsx";
import { createRequire } from "module";
import { basename, join } from "path";
import { cwd } from "process";

export interface CaratsComponent<T = any> extends JSX.FunctionComponent<T> {
  ssp?: string;
  defaultProps?: T
}

export interface CaratsRoute {
  component: CaratsComponent;
  public: boolean;
  static: boolean;
}

export interface CaratsConfig {
  routes: Record<string, CaratsRoute>,
  server: {
    port: number,
    remoteOrigin: string,
    localOrigin: string,
    basePath: string
  },
  suspense: {
    loading: CaratsComponent,
    error: CaratsComponent<Error>,
    notFound: CaratsComponent
  }
}

const defaults: CaratsConfig = {
  routes: {
    '/': {
      public: true,
      static: true,
      component: () => <>💎 Hello World 💎</>
    }
  },
  server: {
    port: 3000,
    remoteOrigin: 'http://localhost',
    localOrigin: 'http://localhost',
    basePath: '/'
  },
  suspense: {
    loading: () => <>💎 Loading...</>,
    error: () => <>💎 Error</>,
    notFound: () => <>💎 Not Found</>
  }
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Record<string, unknown>
  ? Partial<T[P]> | undefined
  : T[P] extends object
  ? DeepPartial<T[P]>
  : T[P] | undefined;
};

export function defineConfig(config: DeepPartial<CaratsConfig>): CaratsConfig {
  return {
    ...defaults,
    ...config,
    routes: {
      ...defaults.routes,
      ...config.routes
    },
    server: {
      ...defaults.server,
      ...config.server
    },
    suspense: {
      ...defaults.suspense,
      ...config.suspense
    }
  } as CaratsConfig;
}

let confCache: CaratsConfig;

export function findClosest(fileName: string): string | undefined {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', ''];
  let dir = cwd();
  while (true) {
    const fileNames: string[] = extensions.map(ext => fileName + ext);
    for (const f of fileNames) {
      const fullPath = join(dir, f);
      if (existsSync(fullPath)) {
        return join(dir, fileName);
      }
    }
    if (dir === basename(dir)) {
      break;
    }
    dir = basename(dir);
    if (!dir) {
      break;
    }
  }
  return undefined;
}

export function getConfig(): CaratsConfig {
  if (confCache) {
    return confCache;
  }

  const fullPath = findClosest('config.cara');
  const _require = createRequire(import.meta.url);

  if (fullPath) {
    const module = _require(fullPath);
    confCache = module.default || module;
    return confCache;
  }

  confCache = defaults;
  return confCache;
}

export interface CaratsRenderContext {
  inAppRouting?: boolean;
  routes: Record<string, CaratsComponent>
  suspense: {
    loading: () => JSX.Element;
    error: (error: Error) => JSX.Element;
    notFound: () => JSX.Element;
  }
}

interface PageComponentResult {
  component: CaratsComponent<any>;
  params: Record<string, string>;
}

export function getPageComponent(this: CaratsRenderContext, path: string): PageComponentResult {

  const { routes, suspense } = this;


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
        return { component: SuspenseComponent, params: matchedParams };
      }
      return { component: component, params: matchedParams };
    }
  }
  return { component: suspense.notFound, params: {} };
}

type Fetcher<T> = (url: string) => Promise<T>;

export async function renderPage<T = any>(this: CaratsRenderContext, url: string, fetcher: Fetcher<T>): Promise<string> {
    const { path, query } = parseUrl(url);
    const { component, params } = getPageComponent.call(this, path);
    const sspUrl = component.ssp ? replaceParams(component.ssp + qs(query), params) : null;
    const props = sspUrl ? await fetcher(sspUrl) : component.defaultProps || { url, params };
    return transpile(component(props));
  }