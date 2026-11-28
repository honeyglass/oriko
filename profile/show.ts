/**
 * The command `oriko profile show` on adx: the stored profile of one posting, and the posting.
 *
 * show: the command, which the tool lists under the words profile show.
 *
 * `oriko read` stores a posting before its profile exists, so a name counts when it has a
 * profile or a posting, and adx refuses any other before the command runs. Both files are read
 * through the root `home`, each with its byte limit; the profile is checked against its shape.
 *
 * @example const { exit, out } = await run(oriko, ['profile', 'show', '--profile', 'acme']);
 */
import { multiline, read } from '@honeyglass/adx';
import { z } from 'zod';
import { Id, Profile } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home, postingFile, profileFile } from '../core/home.ts';
import { storedShape } from '../core/load.ts';

// The steps after it, to profile set and to plan, stand in cli/next.ts, beside plan.
export const show = read({
  does: 'shows a stored profile and the posting read for it',
  input: z.object({ profile: Id.describe('the name of the profile') }),
  example: { profile: 'acme' },
  values: { profile: shownChoices },
  output: z.object({
    name: Id.describe('the name of the profile'),
    profile: Profile.nullable().describe('the stored profile, or null'),
    posting: multiline().nullable().describe('the posting read for it, as Markdown, or null'),
  }),
  run: async ({ profile: name }, { refuse }) => {
    const stored = profileFile(name);
    const profile = stored.exists ? await storedShape('profile', stored) : null;
    if (Array.isArray(profile)) return refuse(...profile);
    const posting = postingFile(name);
    const text = posting.exists ? await posting.text(FILE_LIMITS.readBytes) : null;
    return { name, profile, posting: text };
  },
});

// The names with a profile or a posting, each once.
async function shownChoices() {
  const stored = await home.list('profiles', '.json');
  const postings = await home.list('profiles', '.posting.md');
  const names = new Set([...stored, ...postings].map(file => file.stem));
  return [...names].sort().map(value => ({ value }));
}
