/**
 * The command `oriko init` on adx: a valid, empty CV that names the shared placeholder photo.
 *
 * init: the command, which the tool lists under the word init.
 *
 * The CV goes to `cvs/NAME.json` as a new file, and init never replaces one (adx decision 70):
 * `cv update` and the block commands change it. Every CV starts with the one placeholder
 * `placeholder.png`, directly in the data folder, written once when it is missing, so no name
 * of a CV can meet it. adx writes both files or none, the placeholder first, so a CV never
 * names a photo that is not there. The placeholder's bytes are `assets/placeholder.png` of the
 * package, which lies in no root, so oriko's own code reads them.
 *
 * @example const { exit, out } = await run(oriko, ['init', '--cv', 'erika', '--json', input]);
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { effect, fresh } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { Id, NewCv } from '../core/cv.schema.ts';
import type { Master } from '../core/cv.schema.ts';
import { cvFile, cvNames, home, targetIssue } from '../core/home.ts';
import * as issue from './issues.ts';

const PLACEHOLDER = 'placeholder.png';

const ASSET = join(import.meta.dirname, '..', 'assets', PLACEHOLDER);

export const init = effect({
  does: 'creates a CV',
  input: z.object({ cv: Id.describe('the name of the new CV'), ...NewCv.shape }),
  example: {
    cv: 'erika',
    language: 'de',
    firstName: 'Erika',
    lastName: 'Muster',
    role: 'Entwicklerin',
  },
  values: { cv: fresh(cvNames) },
  replace: false,
  plan: async ({ cv, ...fields }, { files, refuse }) => {
    if ((await cvNames()).includes(cv))
      return refuse(issue.cvExists.at('cv', `The data folder already holds a CV ${shown(cv)}`));
    const file = cvFile(cv);
    const blocked = await targetIssue('cv', home, file);
    if (blocked !== undefined) return refuse(blocked);
    const shared = home.file(PLACEHOLDER);
    const placeholder = shared.exists ? undefined : files.write(shared, await readFile(ASSET));
    const text = `${JSON.stringify(emptyCv(fields), null, 2)}\n`;
    return { cv: files.write(file, text), photo: PLACEHOLDER, placeholder };
  },
});

// Two pages and an English contact title, the same defaults as the example; cv update changes both.
function emptyCv(fields: z.output<typeof NewCv>): Master {
  const { language, ...person } = fields;
  return {
    language,
    person: { ...person, photo: PLACEHOLDER },
    contact: { title: 'Contact', items: [] },
    pages: 2,
    blocks: [],
  };
}
