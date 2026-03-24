import { existsSync } from "fs";
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