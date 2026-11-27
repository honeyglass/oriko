/**
 * The tool oriko on adx: what it is, its folders, and the table of the commands that moved.
 *
 * commands: the table of the commands on adx, by the word that calls each.
 * oriko: the tool, whose main() runs one call.
 *
 * Every command not in the table still runs on the old shell of run.ts; interim.ts sends each
 * call to its side by this table.
 *
 * @example await oriko.main();
 */
import { tool } from '@honeyglass/adx';
import { Master, Profile } from '../core/cv.schema.ts';
import { home, work } from '../core/home.ts';
import { build, preview } from './build.ts';
import { plan } from './plan.ts';

export const commands = { plan, preview, build };

export const oriko = tool({
  name: 'oriko',
  version: '0.1.0',
  does: 'builds a two-column CV as .docx or PDF from a master file and a profile per job posting',
  roots: [home, work],
  // The files a caller writes, so a SCHEMA issue inside one names `oriko schema master` or
  // `oriko schema profile`; adx knows a shape by its value, the one core/issues.ts names.
  shapes: { master: Master, profile: Profile },
  commands,
});
