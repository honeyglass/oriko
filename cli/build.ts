/**
 * The commands `oriko preview` and `oriko build` on adx: the CV set on its pages, as text or a file.
 *
 * preview: the pages of the CV as the terminal shows them.
 * build: the .docx or .pdf of the CV, written to --out inside the working directory.
 *
 * Both combine the page plan of core/ with a look of classic/ or terminal/ and with pdf/, so they
 * live in cli/, where features meet. The file of build is derived: every build makes it again
 * from the CV, so it is replaced without --replace (adx decision 70), and others may read it.
 *
 * @example const { exit, out } = await run(oriko, ['build', '--out', 'cv.docx']);
 */
import { effect, multiline, outFile, read, tell } from '@honeyglass/adx';
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { render } from '../classic/docx.ts';
import type { Engine } from '../classic/docx.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { home, work } from '../core/home.ts';
import type { Issues, Stored } from '../core/issues.ts';
import { checked, fileOf } from '../core/load.ts';
import type { Checked } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { place } from '../core/place.ts';
import type { Plan } from '../core/place.ts';
import { cvChoices, profileChoices } from '../core/sources.ts';
import { toPdf } from '../pdf/convert.ts';
import { withCredits } from '../terminal/credits.ts';
import { renderTerminal } from '../terminal/docx.ts';
import { preview as drawn } from '../terminal/sheets.ts';
import * as issue from './issues.ts';

const STYLES = ['classic', 'terminal'] as const;
const OUTPUTS = ['.docx', '.pdf'];

const credits = z
  .boolean()
  .default(false)
  .describe(
    'names oriko and its author on the right of the last page; build takes it with --style terminal only',
  );

export const preview = read({
  does: 'draws the pages in the terminal',
  input: z.object({ cv, profile, credits }),
  example: {},
  values: { cv: cvChoices, profile: profileChoices },
  output: z.object({ preview: multiline().describe('the pages, 84 characters wide') }),
  run: async ({ cv, profile, credits }, { refuse }) => {
    const sheet = await planned(cv, profile, credits);
    if (Array.isArray(sheet)) return refuse(...sheet);
    return { preview: drawn(sheet.loaded.master, sheet.plan) };
  },
  text: out => out.preview,
  next: (_, { cv, profile }) => [build.step({ cv, profile })],
});

export const build = effect({
  does: 'writes the Word file, or its PDF through LibreOffice',
  input: z.object({
    cv,
    profile,
    out: outFile(work).describe(
      'the .docx or .pdf to write, a path inside the working directory; a .pdf needs LibreOffice',
    ),
    style: z
      .enum(STYLES)
      .default('classic')
      .describe('the look of the file: classic, or terminal like the preview'),
    credits,
  }),
  example: { out: 'cv.docx' },
  values: { cv: cvChoices, profile: profileChoices },
  replace: 'always',
  check: ({ out, style, credits }) => [
    ...(OUTPUTS.some(extension => out.rel.endsWith(extension))
      ? []
      : [issue.wrongExtension.at('out', `The output ${shown(out.rel)} is no .docx or .pdf file`)]),
    ...(credits && style !== 'terminal'
      ? [
          issue.creditsNeedTerminal.at(
            'credits',
            'The option --credits works only in the terminal look',
          ),
        ]
      : []),
  ],
  // A dry run sets the PDF too, so it answers the bytes the real run writes.
  plan: async ({ cv, profile, out, style, credits }, { files, refuse }) => {
    const sheet = await planned(cv, profile, credits);
    if (Array.isArray(sheet)) return refuse(...sheet);
    const isPdf = out.rel.endsWith('.pdf');
    const docx = await rendered(sheet, style, isPdf ? 'libreoffice' : 'google');
    if (Array.isArray(docx)) return refuse(...docx);
    const file = isPdf ? await toPdf(docx) : docx;
    if (Array.isArray(file)) return refuse(...file);
    const written = files.write(out, file, { mode: 0o644 });
    return { ...written, style, pages: sheet.plan.pages.length };
  },
  // A PDF is the finished file; only a .docx still goes through Google Docs.
  next: out =>
    out.file.endsWith('.docx')
      ? [
          tell(
            'upload the .docx to Google Docs, then choose File, Download, PDF; or build a .pdf with LibreOffice',
          ),
        ]
      : [],
});

/** The checked CV, with the credits when asked, and its page plan. */
type Sheet = { loaded: Checked; plan: z.output<typeof Plan> };

/**
 * The credits join the last page the CV fills without them, so the plan is made twice.
 *
 * @param cv - the name `--cv` gives
 * @param profile - the name `--profile` gives
 * @param hasCredits - whether the call asks for the credits
 * @returns the sheet; what the check or the page plan finds, below the file it lies in
 */
async function planned(
  cv: string | undefined,
  profile: string | undefined,
  hasCredits: boolean,
): Promise<Sheet | Issues<Stored>> {
  const loaded = await checked(cv, profile);
  if (Array.isArray(loaded)) return loaded;
  const plan = place(loaded);
  if (Array.isArray(plan)) return plan;
  if (hasCredits === false) return { loaded, plan };
  const credited = { ...loaded, master: withCredits(loaded.master, plan.pages.length) };
  const again = place(credited);
  return Array.isArray(again) ? again : { loaded: credited, plan: again };
}

/**
 * Only the classic look shows the photo, so only it reads the photo file, through the root home
 * with the photo byte limit. The terminal look sets alike in Google Docs and LibreOffice, so only
 * the classic one takes the engine.
 *
 * @param sheet - the checked CV and its plan
 * @param style - the look of the file
 * @param engine - the program that sets the .docx
 * @returns the .docx; PHOTO_UNREADABLE below the file that names the photo
 */
async function rendered({ loaded, plan }: Sheet, style: (typeof STYLES)[number], engine: Engine) {
  if (style === 'terminal') return renderTerminal(loaded.master, plan);
  const bytes = await home.file(loaded.master.person.photo).bytes(FILE_LIMITS.photoBytes);
  // The photo lies in the file that holds `person.photo`: the profile when it sets one.
  const file = fileOf(
    loaded.cv,
    loaded.profile,
  )({ code: 'PHOTO_UNREADABLE', path: 'person.photo' });
  return render(loaded.master, plan, { bytes, file }, engine);
}
