/**
 * The tool oriko on adx: what it is, its folders, and the table of the commands that moved.
 *
 * commands: the table of the commands on adx, by the words that call each.
 * oriko: the tool, whose main() runs one call.
 *
 * Every command not in the table still runs on the old shell of run.ts; interim.ts sends each
 * call to its side by this table.
 *
 * @example await oriko.main();
 */
import { tool } from '@honeyglass/adx';
import { set as photoSet } from '../classic/photo.ts';
import { Block, ContactItem, Item, Master, Profile } from '../core/cv.schema.ts';
import { home, work } from '../core/home.ts';
import { commands as edit } from '../edit/commands.ts';
import { build, preview } from './build.ts';
import { next } from './next.ts';
import { plan } from './plan.ts';

export const commands = { plan, preview, build, photo: { set: photoSet }, ...edit };

export const oriko = tool({
  name: 'oriko',
  version: '0.1.0',
  does: 'builds a two-column CV as .docx or PDF from a master file and a profile per job posting',
  roots: [home, work],
  // What a caller writes and no command takes whole, so a SCHEMA issue inside one names its
  // shape, such as `oriko schema item`; adx knows a shape by its value, the one the input or
  // check() names. block, item and contact share their word with a group: `oriko schema block`
  // is the shape, `oriko schema block add` the command.
  shapes: { master: Master, profile: Profile, block: Block, item: Item, contact: ContactItem },
  commands,
  next,
});
