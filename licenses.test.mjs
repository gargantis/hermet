import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditDist } from './audit-dist.mjs';
import { writeLicenseNotices } from './licenses.mjs';

// The notices writeLicenseNotices writes are the list the dist audit checks.
// licenses.fixture.json is the licence JSON Vite 8.3.5 wrote for a build of
// roslambo at 3809d3a: Vite's real shape, { name, version, identifier, text }.
let dir;
let dist;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'hermet-licenses-'));
  dist = join(dir, 'dist');
  await mkdir(dist);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const audit = (expectedLicensePackages) => auditDist(dist, { allowedHosts: [], expectedLicensePackages });

describe('licence notices', () => {
  it("turns Vite's licence JSON into one section per package, with its licence text, and deletes the JSON", async () => {
    const vite = await readFile(new URL('./licenses.fixture.json', import.meta.url), 'utf8');
    await writeFile(join(dist, '.license-npm.json'), vite);
    await writeLicenseNotices({ product: 'test', dist });
    expect(await readdir(dist)).toEqual(['THIRD-PARTY-LICENSES.txt']);
    const text = await readFile(join(dist, 'THIRD-PARTY-LICENSES.txt'), 'utf8');
    const deps = JSON.parse(vite);
    for (const dep of deps) expect(text).toContain(`## ${dep.name}@${dep.version}\n\n${dep.identifier}\n\n${dep.text.trimEnd()}`);
    expect(text).toContain('Permission is hereby granted');
    expect((await audit(deps.map((d) => d.name))).findings).toEqual([]);
  });

  it('also reads the field names license and licenseText', async () => {
    await writeFile(
      join(dist, '.license-npm.json'),
      JSON.stringify([{ name: '@scope/pkg', version: '1.2.3', license: 'MIT', licenseText: 'Permission is granted.' }]),
    );
    await writeLicenseNotices({ product: 'test', dist });
    const text = await readFile(join(dist, 'THIRD-PARTY-LICENSES.txt'), 'utf8');
    expect(text).toContain('## @scope/pkg@1.2.3\n\nMIT\n\nPermission is granted.');
    expect((await audit(['@scope/pkg'])).findings).toEqual([]);
  });

  it('writes a package that has no licence text as a bare section, which the audit fails', async () => {
    await writeFile(join(dist, '.license-npm.json'), JSON.stringify([{ name: 'plain', version: '0.1.0', identifier: 'ISC' }]));
    await writeLicenseNotices({ product: 'test', dist });
    expect((await audit(['plain'])).findings.map((f) => f.why)).toEqual(['licence notice without text']);
  });

  it('adds the notices the npm JSON cannot see, and copes without it', async () => {
    await writeFile(join(dir, 'LICENSE'), 'Vendored licence text.');
    await writeLicenseNotices({
      product: 'test',
      dist,
      extra: [{ name: 'vendored', version: '1.0.0', license: 'MIT', file: join(dir, 'LICENSE') }],
    });
    const text = await readFile(join(dist, 'THIRD-PARTY-LICENSES.txt'), 'utf8');
    expect(text).toContain('Third-party notices for the test distribution.');
    expect(text).toContain('## vendored@1.0.0\n\nMIT\n\nVendored licence text.');
    expect((await audit(['vendored'])).findings).toEqual([]);
  });
});
