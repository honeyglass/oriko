/**
 * The commands of oriko on adx keep the Agent DX rules that adx's test kit probes.
 *
 * Each probe runs in the process of the test, in a fresh data folder that holds the reference
 * CV 'jane' and the profiles 'acme' and 'broken'.
 *
 * @example node --test tests/api/conformance.api.spec.ts
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { conformance } from '@honeyglass/adx/test';
import { oriko } from '../../cli/oriko.ts';
import { seed } from '../utils/cli.ts';

const folder = mkdtempSync(join(tmpdir(), 'oriko-seed-'));
seed(folder);

test('oriko keeps the agent rules', t => conformance(t, oriko, { seed: folder }));
