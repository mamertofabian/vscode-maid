const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  // Extension context (Node.js)
  const extensionCtx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode', 'jsonc-parser'],
    logLevel: 'silent',
    plugins: [esbuildProblemMatcherPlugin],
  });

  // Webview context (Browser)
  const webviewCtx = await esbuild.context({
    entryPoints: ['webview-ui/src/index.tsx'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'browser',
    outfile: 'out/webview/main.js',
    external: [],
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css',
      '.svg': 'dataurl',
      '.png': 'dataurl',
    },
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"',
    },
    logLevel: 'silent',
    plugins: [webviewProblemMatcherPlugin],
  });

  if (watch) {
    await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
  } else {
    await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
    await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[extension] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      console.log('[extension] build finished');
    });
  },
};

/**
 * @type {import('esbuild').Plugin}
 */
const webviewProblemMatcherPlugin = {
  name: 'webview-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[webview] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`);
        }
      });
      console.log('[webview] build finished');
    });
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
