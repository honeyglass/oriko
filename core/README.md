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
- `files.ts`: reads files and pipes up to a size limit, such as a picture or a source of `read`
  the person names anywhere on the disk.
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
- `home.old.ts`: finds the CVs in `cvs/` and the profiles in `profiles/` of the data folder for
  the old shell, and checks that the data folder can be read.
- `issues.old.ts`: makes each issue that `core/` or several folders raise, one function per issue.
- `options.old.ts`: lists every option of every command, and writes the options of a call with
  their values quoted for a shell.
- `home.ts`: names the data folder and the working directory for adx, and the CV, profile and
  posting files in the data folder; it refuses a write whose target is a link to another file.
- `issues.ts`: declares the codes `core/` and several folders raise on adx, holds the input to
  the byte limit of a stored file, and turns an issue of the check or of the page plan into one
  of adx, below the field that names its file or at a place the command picks.
- `load.ts`: reads the CV and the profile a command on adx names, picks the CV and checks both;
  it also reads the CV an edit changes, a new profile belongs to, or `show` outlines.
- `options.ts`: describes the fields `--cv` and `--profile`, with the one text each has.
- `place.ts`: plans the pages: it puts each block whole on a page, or names the blocks that do not
  fit; it describes the plan as a schema, decides which of the two files an issue lies in, the
  issue of the photo included, and says whether a CV an edit changed still fits its pages.
- `sources.ts`: lists the stored CVs and profiles, the values `--cv` and `--profile` take, the
  profiles that may go with one CV, and the blocks of one CV, the values of `--block`.

## Example

```ts
import { checked } from '../core/load.ts';
import { place } from '../core/place.ts';

const loaded = await checked(cv, profile);
if (Array.isArray(loaded)) return refuse(...loaded);
const placed = place(loaded);
return Array.isArray(placed) ? refuse(...placed) : placed;
```

A command on adx checks the CV first and plans the pages from it; each step gives back its value
or the issues, which the command refuses with. The files that end in `.old.ts` serve what still
runs on the old shell, such as `oriko schema`, and `issues.old.ts` also makes the issues of
`check.ts`, `place.ts` and `files.ts`, which only the commands on adx call.

## Connections

- **Uses:** nothing outside itself.
- **Used by:**
  - [bin/](../bin/README.md): imports `files.limits.ts`, `files.ts`
  - [classic/](../classic/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `files.ts`, `home.ts`, `issues.ts`, `load.ts`, `measure.ts`, `metrics.ts`,
    `options.ts`, `place.ts`, `sources.ts`, `zip.ts`
  - [cli/](../cli/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `home.old.ts`, `home.ts`, `issues.ts`, `load.ts`, `options.old.ts`,
    `options.ts`, `place.ts`, `sources.ts`
  - [cv/](../cv/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `home.ts`,
    `issues.ts`, `load.ts`, `options.ts`, `place.ts`, `sources.ts`
  - [edit/](../edit/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `home.ts`, `issues.ts`, `load.ts`, `options.ts`, `place.ts`, `sources.ts`
  - [pdf/](../pdf/README.md): imports `issues.ts`
  - [profile/](../profile/README.md): imports `check.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `home.ts`, `issues.ts`, `load.ts`, `place.ts`, `sources.ts`
  - [read/](../read/README.md): imports `cv.schema.ts`, `errors.ts`, `files.limits.ts`, `files.ts`,
    `home.ts`, `issues.old.ts`, `issues.ts`, `load.ts`, `options.ts`, `sources.ts`
  - [terminal/](../terminal/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `metrics.ts`,
    `place.ts`, `zip.ts`

---

[← Back to the README](../README.md)
