#!/usr/bin/env node
// This repo is public too, so it scans itself the way the apps do. The
// private denylist is named by $GATE_PRIVATE_TERMS, kept OUTSIDE the repo.
import { runPublicScan } from '../public-scan.mjs';

runPublicScan({ termsEnv: 'GATE_PRIVATE_TERMS' });
