import esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const watch = process.argv.includes('--watch');

mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const file of ['index.html', 'styles.css']) {
  cpSync(path.join(root, 'src', file), path.join(root, 'dist', file));
}

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [path.join(root, 'src', 'renderer.js')],
  outfile: path.join(root, 'dist', 'renderer.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  // The SDK's renderer entry re-exports pure constants and never touches the
  // native runtime, but keep electron out of the browser bundle anyway.
  external: ['electron'],
  legalComments: 'none',
  sourcemap: watch,
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('watching src/ for changes');
} else {
  await esbuild.build(options);
  console.log('built dist/renderer.js');
}
