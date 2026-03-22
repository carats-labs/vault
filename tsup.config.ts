import { defineConfig } from 'tsup';

export default defineConfig({
  format: ['esm'],
  minify: true,
  bundle: true,
  dts: {
    resolve: true,
  },
  external: [/@carats.*/, 'jjsx', 'express'],
});