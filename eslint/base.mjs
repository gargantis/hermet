// The ESLint setup each app starts from: the recommended JavaScript and
// TypeScript rules, unused arguments allowed when named _x, and Node's
// globals for scripts, end-to-end tests and tool configs. Each app's
// eslint.config.mjs adds its own contracts after it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const nodeGlobals = Object.fromEntries(
  [
    'process', 'console', 'Buffer', 'URL', 'URLSearchParams', 'TextEncoder',
    'TextDecoder', 'fetch', 'crypto', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone',
    'AbortController', 'WebSocket', 'performance', 'Blob', 'Response', 'Request',
  ].map((n) => [n, 'readonly']),
);

/** `ignores` adds the app's own folders to the shared ones. */
export function baseConfig({ ignores = [] } = {}) {
  return [
    {
      ignores: [
        'node_modules/**',
        'dist/**',
        'research/**', // research spikes keep their own toolchains
        'test-results/**',
        'playwright-report/**',
        '.cache/**',
        '.wrangler/**',
        'vendor/**', // each submodule lints itself
        'scripts/eslint/fixtures/**',
        ...ignores,
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.ts'] })),
    {
      files: ['**/*.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['scripts/**', 'e2e/**', '*.config.ts', '*.config.mjs'],
      languageOptions: { globals: nodeGlobals },
    },
  ];
}
