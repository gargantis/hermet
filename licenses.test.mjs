import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditDist } from './audit-dist.mjs';
import { writeLicenseNotices } from './licenses.mjs';

// The notices writeLicenseNotices writes are the list the dist audit checks.
let dir;
let dist;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'gate-licenses-'));
  dist = join(dir, 'dist');
  await mkdir(dist);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const audit = (expectedLicensePackages) => auditDist(dist, { allowedHosts: [], expectedLicensePackages });

describe('licence notices', () => {
  it('turns the npm licence JSON into one section per package, and deletes the JSON', async () => {
    await writeFile(
      join(dist, '.license-npm.json'),
      JSON.stringify([
        { name: '@scope/pkg', version: '1.2.3', license: 'MIT', licenseText: 'Permission is granted.' },
        { name: 'plain', version: '0.1.0', license: 'ISC' },
      ]),
    );
    await writeLicenseNotices({ product: 'test', dist });
    expect(await readdir(dist)).toEqual(['THIRD-PARTY-LICENSES.txt']);
    expect((await audit(['@scope/pkg', 'plain'])).findings).toEqual([]);
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
