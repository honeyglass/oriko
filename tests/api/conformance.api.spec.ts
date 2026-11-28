/**
 * The tool oriko keeps the Agent DX rules that adx's test kit probes, its skill among them.
 *
 * Each probe runs in the process of the test, in a fresh data folder that holds the reference
 * CV 'jane' and the profiles 'acme' and 'broken'. The examples of photo set and read name a file
 * of the package relative to its root, so the test runs there; the program itself, which the kit
 * starts in an empty working directory, is not probed.
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

const samples = { seed: folder, skillFile: '.claude/skills/oriko/SKILL.md' };

test('oriko keeps the agent rules', t => conformance(t, oriko, samples));
