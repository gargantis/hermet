import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanText, isProbablyBinary } from './public-scan.mjs';

// public-scan fails on absolute home paths and key material in a
// repo's files, and on terms from an optional denylist kept outside it.
// Fixture strings are assembled at runtime so this file itself never
// contains what the scanner hunts for.
const sep = '/';
const home = (base, user) => `${sep}${base}${sep}${user}${sep}`;

describe('public-scan core', () => {
  it('flags absolute home paths on all three platforms', () => {
    const text = [
      'ok line',
      `path ${home('home', 'someone')}git/x`,
      `mac ${home('Users', 'Some.One')}code`,
      `win C:${'\\'}Users${'\\'}someone${'\\'}x`,
    ].join('\n');
    const found = scanText('doc.md', text, []);
    expect(found.map((f) => f.line)).toEqual([2, 3, 4]);
  });

  it('flags private key material', () => {
    const marker = ['-----BEGIN OPENSSH', 'PRIVATE KEY-----'].join(' ');
    const found = scanText('a.txt', marker, []);
    expect(found).toHaveLength(1);
  });

  it('flags denylist terms case-insensitively, as whole words', () => {
    const found = scanText('b.md', 'about SECRETWORD here\nsecretwordy is fine', ['secretword']);
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(1);
  });

  it('never reveals the denylist term in the finding', () => {
    const [f] = scanText('b.md', 'x secretword y', ['secretword']);
    expect(JSON.stringify(f)).not.toContain('secretword');
  });

  it('returns nothing on clean text', () => {
    expect(scanText('c.ts', 'const homeDir = os.homedir();', [])).toEqual([]);
  });

  it('detects binary buffers', () => {
    expect(isProbablyBinary(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1]))).toBe(true);
    expect(isProbablyBinary(Buffer.from('plain text\n'))).toBe(false);
  });
});

describe('runPublicScan', () => {
  // A throwaway repo whose `sub` is a gitlink, as a submodule is.
  let dir;
  const git = (cwd, ...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...args], { cwd, stdio: 'pipe' });
  const scan = (env = {}) =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { runPublicScan } from ${JSON.stringify(new URL('./public-scan.mjs', import.meta.url).href)};
         runPublicScan({ termsEnv: 'HERMET_TEST_TERMS' });`,
      ],
      { cwd: join(dir, 'repo'), env: { ...process.env, HERMET_TEST_TERMS: '', ...env }, encoding: 'utf8' },
    );

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hermet-public-scan-'));
    const repo = join(dir, 'repo');
    mkdirSync(join(repo, 'sub'), { recursive: true });
    git(repo, 'init', '-q');
    git(join(repo, 'sub'), 'init', '-q');
    git(join(repo, 'sub'), 'commit', '-q', '--allow-empty', '-m', 'sub');
    git(repo, 'add', 'sub');
    writeFileSync(join(repo, 'a.txt'), 'clean text\n');
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('passes a clean repo, skipping its submodules', () => {
    const r = scan();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('fails on an untracked file and on a denylist term, without echoing the term', () => {
    writeFileSync(join(dir, 'repo', 'b.md'), `see ${home('home', 'someone')}x\n`);
    writeFileSync(join(dir, 'repo', 'c.md'), 'a secretword here\n');
    writeFileSync(join(dir, 'terms'), '# comment\nsecretword\n');
    const r = scan({ HERMET_TEST_TERMS: join(dir, 'terms') });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('b.md:1: absolute home path');
    expect(r.stderr).toContain('c.md:1: denylist term');
    expect(r.stderr).not.toContain('secretword');
  });
});
