// Bundled packages keep their licences, so their notices ship in
// dist/THIRD-PARTY-LICENSES.txt. writeLicenseNotices turns the npm licence
// JSON Vite writes (build.license.fileName '.license-npm.json') into that
// file, then deletes the JSON so the dist audit never sees it; the audit
// checks the list against scripts/expected-licenses.json, and that every
// section carries its licence text.
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * `product` names the distribution in the file's header. `extra` adds
 * notices the npm JSON cannot see, such as worker-only dependencies and
 * vendored sources, each { name, version, license, file } where `file` is
 * the path of its licence text.
 */
export async function writeLicenseNotices({ product, dist = join(process.cwd(), 'dist'), extra = [] }) {
  const licenseJson = join(dist, '.license-npm.json');
  const parts = [];
  if (existsSync(licenseJson)) {
    // Vite 8 emits an array of { name, version, identifier?, text? }:
    // `identifier` is the package.json licence and `text` its LICENSE file,
    // each absent when the package has none. The names this file read
    // before, `license` and `licenseText`, are kept as fallbacks.
    const raw = JSON.parse(await readFile(licenseJson, 'utf8'));
    const list = Array.isArray(raw) ? raw : (raw.dependencies ?? []);
    for (const dep of list) {
      parts.push(notice(dep.name, dep.version, dep.identifier ?? dep.license ?? '', dep.text ?? dep.licenseText ?? ''));
    }
    await rm(licenseJson);
  }
  for (const e of extra) parts.push(notice(e.name, e.version, e.license, await readFile(e.file, 'utf8')));

  const header = `Third-party notices for the ${product} distribution.\nEach section is one bundled package.\n`;
  await writeFile(join(dist, 'THIRD-PARTY-LICENSES.txt'), `${header}\n${parts.join('\n\n')}\n`);
  console.log(`licenses: wrote THIRD-PARTY-LICENSES.txt with ${parts.length} entries`);
}

// The dist audit reads each section's `## name@version` heading.
const notice = (name, version, license, text) => `## ${name}@${version}\n\n${license}\n\n${text}`.trim();
