/**
 * The command that creates a new CV: a valid, empty CV file and a placeholder photo in cvs/.
 *
 * createCv: writes cvs/NAME.json and cvs/NAME.png, or answers why not.
 *
 * The name becomes a file name, so it passes the id pattern before any path is built from it.
 *
 * @example const answer = await createCv({ home, name: 'erika', input, isDryRun: false });
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.ts';
import * as coreIssue from '../core/issues.old.ts';
import { check } from '../core/check.ts';
import { Id, NewCv } from '../core/cv.schema.ts';
import type { Master } from '../core/cv.schema.ts';
import { writeAll } from '../core/files.ts';
import { cvNames } from '../core/home.old.ts';

const PLACEHOLDER = join(import.meta.dirname, '..', 'assets', 'placeholder.png');

type Request = { home: string; name: string | undefined; input: unknown; isDryRun: boolean };

/**
 * @param request - the data folder, the name of the new CV, its unchecked input, and whether to write
 * @returns the name and the files of the new CV
 */
export async function createCv(request: Request): Promise<Result<Record<string, unknown>>> {
  const { home, input, isDryRun } = request;
  const name = Id.safeParse(request.name);
  if (name.success === false)
    return rejected('init', coreIssue.schemaIssues(name.error, ['cv'], 'init'));
  if ((await cvNames(home)).includes(name.data))
    return rejected('init', [issue.cvExists(name.data)]);
  const fields = NewCv.safeParse(input);
  if (fields.success === false)
    return rejected('init', coreIssue.schemaIssues(fields.error, [], 'init'));
  const master = emptyCv(name.data, fields.data);
  const checked = check(master);
  if (checked.error !== null) return checked;
  const files = { cv: `cvs/${name.data}.json`, photo: master.person.photo };
  if (isDryRun) return done({ command: 'init', ...files, written: false });
  // The CV file moves in last, so a CV never lists a photo that is not there.
  const written = await writeAll(
    [
      { path: join(home, files.photo), content: await readFile(PLACEHOLDER) },
      { path: join(home, files.cv), content: `${JSON.stringify(master, null, 2)}\n` },
    ],
    'home',
  );
  if (written.error !== null) return written;
  return done({ command: 'init', ...files, written: true });
}

// Two pages and an English contact title, the same defaults as the example; cv update changes both.
function emptyCv(
  name: string,
  fields: { language: string; firstName: string; lastName: string; role: string },
): Master {
  const { language, ...person } = fields;
  return {
    language,
    person: { ...person, photo: `cvs/${name}.png` },
    contact: { title: 'Contact', items: [] },
    pages: 2,
    blocks: [],
  };
}
