import { existsSync } from "fs";
import { basename, join } from "path";
import { pathToFileURL } from "url";

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
  ? T[P] | undefined
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
  };
}

let confCache: CaratsConfig;

export function findClosest(fileName: string): string | undefined {
  let dir = import.meta.dirname;
  while (true) {
    const fullPath = join(dir, ...fileName.split('/'));
    if (existsSync(fullPath)) {
      return fullPath;
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

export async function getConfig(): Promise<CaratsConfig> {
  if (confCache) {
    return confCache;
  }
  
  const fullPath = findClosest('config.cara.ts');

  if (fullPath) {
    const module = await import(pathToFileURL(fullPath).href);
    confCache = module.default || module;
    return confCache;
  }

  confCache = defaults;
  return confCache;
}