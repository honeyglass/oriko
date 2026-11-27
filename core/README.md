# core/

What every feature shares: the shape of a CV, the rules it must follow, and how pages are planned.

A CV enters oriko as a JSON file. Before anything uses it, `core/` checks it in layers, the shape
first, and refuses it with every problem of the first layer that fails. It then plans the pages:
which block stands on which page, each block whole, with heights estimated from the text. The
classic and the terminal style (`--style`) both build on that plan, so the preview and the files
always agree.

It also holds what several features need alike: reading and writing files safely, finding the
data folder, the options of the commands, and the one shape of an error. `core/` imports nothing
from the other folders, so every feature can rely on it.

## Modules

- `cv.schema.ts`: describes the shape of a CV, a profile and every kind of block, and refuses a
  text with hidden characters.
- `cv.limits.ts`: lists the four block kinds, the column each one sits in, the contact icons and
  the largest sizes a CV may have.
- `check.ts`: checks a CV and its profile, applies the profile, and gives back the CV to build or
  the list of problems.
- `files.ts`: reads files and pipes up to a size limit, writes all files of one command or none,
  and keeps a photo inside the data folder.
- `files.limits.ts`: sets how large the JSON input, a photo, and a posting, notes or an old CV may
  be.
- `metrics.ts`: holds every distance of the page, so the estimate and the finished file use the
  same numbers.
- `measure.ts`: estimates how tall a block is from its text alone.
- `zip.ts`: makes a finished .docx the same bytes for the same input, and sets the photo line so
  Google Docs lays it out right.
- `errors.ts`: holds the one error shape, a refusal that lists every issue, and the `Result` that
  holds either `data` or an `error`. [docs/cli.md](../docs/cli.md#a-refusal) shows how a refusal
  reads.
- `home.old.ts`: finds the CVs in `cvs/` and the profiles in `profiles/` of the data folder, and
  picks the CV a command works on.
- `issues.old.ts`: makes each issue that `core/` or several folders raise, one function per issue.
- `load.old.ts`: reads the CV and the profile a command names, and checks them in one step.
- `options.old.ts`: lists every option of every command, and writes the options of a call with
  their values quoted for a shell.
- `place.old.ts`: plans the pages: it puts each block whole on a page, or names the blocks that do
  not fit.

## Example

```ts
import { checked } from '../core/load.old.ts';
import { place } from '../core/place.old.ts';

const cv = await checked(home, cvName, profileName);
if (cv.error !== null) return cv;
const plan = place(cv.data);
```

A feature checks the CV first and plans the pages from it; each step gives back either `data` or
an `error` to pass on.

## Connections

- **Uses:** nothing outside itself.
- **Used by:**
  - [bin/](../bin/README.md): imports `files.limits.ts`, `files.ts`
  - [classic/](../classic/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `files.ts`, `home.old.ts`, `issues.old.ts`, `measure.ts`, `metrics.ts`,
    `place.old.ts`, `zip.ts`
  - [cli/](../cli/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `files.ts`, `home.old.ts`, `issues.old.ts`, `load.old.ts`, `options.old.ts`,
    `place.old.ts`
  - [cv/](../cv/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.ts`, `home.old.ts`, `issues.old.ts`, `load.old.ts`, `place.old.ts`
  - [edit/](../edit/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.ts`, `home.old.ts`, `issues.old.ts`, `place.old.ts`
  - [pdf/](../pdf/README.md): imports `errors.ts`
  - [profile/](../profile/README.md): imports `check.ts`, `cv.schema.ts`, `errors.ts`, `files.ts`,
    `home.old.ts`, `issues.old.ts`, `load.old.ts`, `options.old.ts`, `place.old.ts`
  - [read/](../read/README.md): imports `cv.schema.ts`, `errors.ts`, `files.limits.ts`, `files.ts`,
    `home.old.ts`, `issues.old.ts`
  - [terminal/](../terminal/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `metrics.ts`, `place.old.ts`, `zip.ts`

---

[← Back to the README](../README.md)
