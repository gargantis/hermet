import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from './exact-ops.mjs';

// Where the rule applies, only exactly rounded operations are allowed: the
// Math allowlist (which also bans Math.random), no `**`, no Date,
// performance, crypto or Intl.
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2023, sourceType: 'module' } });

describe('exact-ops rule', () => {
  it('accepts exact operations and rejects the rest', () => {
    tester.run('exact-ops', rule, {
      valid: [
        'const a = Math.sqrt(2) + Math.imul(3, 4);',
        'const b = Math.min(Math.max(x, 0), 1) | 0;',
        'const c = Math.fround(x) * Math.abs(y) % Math.floor(z);',
        'const d = Math.clz32(n) + Math.trunc(m) - Math.ceil(k) + Math.round(j) + Math.PI;',
        'const performance = 1; const p = performance + 1;',
        'const o = { Date: 1 }; const q = o.Date;',
      ],
      invalid: [
        { code: 'const a = Math.pow(x, 2);', errors: 1 },
        { code: 'const a = Math.sin(x);', errors: 1 },
        { code: 'const a = Math.cos(x);', errors: 1 },
        { code: 'const a = Math.tanh(x);', errors: 1 },
        { code: 'const a = Math.atan2(y, x);', errors: 1 },
        { code: 'const a = Math.hypot(x, y);', errors: 1 },
        { code: 'const a = Math.exp(x);', errors: 1 },
        { code: 'const a = Math.random();', errors: 1 },
        { code: 'const a = Math["exp"](x);', errors: 1 },
        { code: 'const a = x ** 2;', errors: 1 },
        { code: 'x **= 2;', errors: 1 },
        { code: 'const t = Date.now();', errors: 1 },
        { code: 'const t = new Date();', errors: 1 },
        { code: 'const t = performance.now();', errors: 1 },
        { code: 'const r = crypto.getRandomValues(buf);', errors: 1 },
        { code: 'const f = new Intl.NumberFormat();', errors: 1 },
      ],
    });
  });
});
