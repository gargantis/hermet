// public-scan: a public repo must never carry a home path, private key
// material or a term from the owner's private denylist. scanText and
// isProbablyBinary are pure, so the gate's behaviour is unit-tested without
// git or files; runPublicScan is what each repo's scripts/public-scan.mjs
// calls.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const BUILTIN = [
  { re: /\/home\/[A-Za-z0-9._-]+\//, why: 'absolute home path' },
  { re: /\/Users\/[A-Za-z0-9._-]+\//, why: 'absolute home path' },
  { re: /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+/, why: 'absolute home path' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'private key material' },
];

/** Scan one file's text. `extraTerms` come from the out-of-repo denylist;
 *  findings never echo the matched denylist term. */
export function scanText(path, text, extraTerms) {
  const findings = [];
  const terms = extraTerms.map((t) => ({
    re: new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, 'i'),
  }));
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { re, why } of BUILTIN) {
      const m = re.exec(line);
      if (m) findings.push({ path, line: i + 1, match: m[0], why });
    }
    for (const { re } of terms) {
      if (re.test(line)) {
        findings.push({ path, line: i + 1, match: '<private term>', why: 'denylist term' });
      }
    }
  }
  return findings;
}

export function isProbablyBinary(buf) {
  const n = Math.min(buf.length, 8192);
  for (let i = 0; i < n; i++) {
    const b = buf[i];
    if (b === 0) return true;
    if (b < 7 && b !== 0) return true;
  }
  return false;
}

/** Scans the repo in the working directory and exits non-zero on any
 *  finding. `termsEnv` names the environment variable holding the path of
 *  a denylist kept OUTSIDE the repo, one term per line; CI has no denylist
 *  and runs the built-in patterns only. */
export function runPublicScan({ termsEnv }) {
  const extraTerms = [];
  const termsPath = process.env[termsEnv];
  if (termsPath && existsSync(termsPath)) {
    for (const line of readFileSync(termsPath, 'utf8').split('\n')) {
      const t = line.trim();
      if (t && !t.startsWith('#')) extraTerms.push(t);
    }
  }

  // Tracked files plus untracked-but-not-ignored, so a finding is caught
  // before its first commit, not after.
  const files = execFileSync('git', ['ls-files', '-z', '-c', '-o', '--exclude-standard'], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);

  let findings = [];
  for (const path of files) {
    // A submodule is listed as its directory; it runs its own scan.
    if (statSync(path).isDirectory()) continue;
    const buf = readFileSync(path);
    if (isProbablyBinary(buf)) continue;
    findings = findings.concat(scanText(path, buf.toString('utf8'), extraTerms));
  }

  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`public-scan: ${f.path}:${f.line}: ${f.why} (${f.match})`);
    }
    process.exit(1);
  }
  console.log(`public-scan: ${files.length} tracked files clean`);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
