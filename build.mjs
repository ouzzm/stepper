import { context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const preview = process.argv.includes('--preview');
const outdir = preview ? 'preview-dist' : 'dist';
const PREVIEW_PORT = 5173;

const entryPoints = preview
  ? {
      preview: 'src/preview/preview.ts',
      shim: 'src/preview/chromeShim.ts',
      options: 'src/options/options.ts',
    }
  : {
      background: 'src/background.ts',
      content: 'src/content/index.ts',
      options: 'src/options/options.ts',
    };

async function copyStatic() {
  await mkdir(outdir, { recursive: true });
  await cp('src/options/options.css', `${outdir}/options.css`);
  if (preview) {
    await cp('preview/index.html', `${outdir}/index.html`);
    // Same settings page, with the chrome.* stand-in loaded before it.
    const html = await readFile('src/options/options.html', 'utf8');
    await writeFile(
      `${outdir}/options.html`,
      html.replace('<script src="options.js"></script>', '<script src="shim.js"></script>\n    <script src="options.js"></script>'),
    );
  } else {
    await cp('src/manifest.json', `${outdir}/manifest.json`);
    await cp('src/options/options.html', `${outdir}/options.html`);
  }
}

/** Re-copies html, css and manifest after every (re)build so watch mode picks them up. */
const copyStaticPlugin = {
  name: 'copy-static',
  setup(build) {
    build.onEnd(() => copyStatic());
  },
};

await rm(outdir, { recursive: true, force: true });

const ctx = await context({
  entryPoints,
  outdir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  loader: { '.css': 'text' },
  sourcemap: watch || preview ? 'inline' : false,
  logLevel: 'info',
  plugins: [copyStaticPlugin],
});

if (preview) {
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: PREVIEW_PORT });
  console.log(`Preview: http://localhost:${port}/`);
} else if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
