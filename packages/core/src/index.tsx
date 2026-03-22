import { existsSync } from "fs";
import { join } from "path";
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
    basePath: string
  }
}

const defaults: CaratsConfig = {
  routes: {
    '/': {
      public: true,
      static: true,
      component: () => <>💎</>
    }
  },
  server: {
    port: 3000,
    remoteOrigin: 'http://localhost',
    basePath: '/'
  }
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
  ? Record<string, unknown>[]
  : T[P] extends object
  ? DeepPartial<T[P]>
  : T[P];
};

export function defineConfig(config: DeepPartial<CaratsConfig>) {
  return {
    routes: {
      ...defaults.routes,
      ...config.routes
    },
    server: {
      ...defaults.server,
      ...config.server
    }
  };
}

export async function getConfig(): Promise<CaratsConfig> {
  const root = process.cwd();
  const fullPath = join(root, 'config.cara');

  if (existsSync(fullPath)) {
    // pathToFileURL is essential for Windows compatibility!
    const module = await import(pathToFileURL(fullPath).href);
    return module.default || module;
  }

  return defaults;
}