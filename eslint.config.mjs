import { baseConfig, nodeGlobals } from './eslint/base.mjs';

// This repo lints itself with the base it gives the apps. Its .mjs code
// runs in Node; room-config.ts runs in the apps' browser bundles.
export default [
  ...baseConfig(),
  { files: ['**/*.mjs'], languageOptions: { globals: nodeGlobals } },
];
