import { baseConfig, nodeGlobals } from './eslint/base.mjs';

// This repo lints itself with the base it gives the apps; all of its code
// runs in Node.
export default [
  ...baseConfig(),
  { files: ['**/*.mjs'], languageOptions: { globals: nodeGlobals } },
];
