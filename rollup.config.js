import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';

export default {
  input: 'src/main.js',
  output: {
    format: 'cjs',
    file: 'main.js',
    exports: 'default',
  },
  external: ['obsidian', 'fs', 'os', 'path'],
  plugins: [
    svelte({
      emitCss: false,
      preprocess: autoPreprocess(),
    }),
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs({
      include: 'node_modules/**',
    }),
  ],
};
