# cli/

The tool oriko: its commands, the steps between them, and where a caller starts.

A call is a command with its options, such as `oriko build --profile acme --out cv.pdf`. The
toolkit `@honeyglass/adx` reads the call, checks the command, its options and its input, guards
the folders, and writes the answer in the one shape it gives every tool: one line of JSON for a
program or an agent, text for a person. This folder declares what adx needs for that: the table of
the commands, the shapes a caller writes, the steps that follow a success and the commands that
help with a refusal. `oriko schema`, `--help` and `--version` are adx's own, made from these
declarations.

It is the only folder that combines several features. A build, for example, uses the page plan
from `core/`, the classic or terminal style (`--style`) from `classic/` or `terminal/`, and `pdf/`
for the PDF.

## Modules

- `build.ts`: runs `preview` and `build` on adx, which need the page plan, a style and maybe the
  PDF; `build` writes its file inside the working directory.
- `oriko.ts`: the tool on adx: its name, its skill, its folders, the table of its commands, and
  the first steps of `oriko` alone, which follow what the data folder holds.
- `plan.ts`: runs `plan` on adx: it checks the CV and its profile and places every block.
- `issues.ts`: the errors of `build` on adx: an `--out` file that is no .docx or .pdf, and
  `--credits` without the terminal style.
- `next.ts`: names the steps on adx that lead from a feature into `cli/`, such as `build` after
  `photo set`, `plan` after `profiles`, `preview` and `build` after an edit or a stored
  profile that leaves the CV fitting its pages, and `profile set`, `show` or `init` after `read`.
- `hints.ts`: names the command of `cv/` that helps with a refusal every feature raises: `init`
  for `NO_CV`, `cvs` for `UNKNOWN_CV`, and `show` with the block ids for `UNKNOWN_BLOCK`.

## Example

```sh
oriko block --output json
```

```json
{"ok":true,"result":{"commands":[{"command":"oriko block add","does":"adds a block, such as a job or a skill group"},{"command":"oriko block update","does":"changes fields of a block"},{"command":"oriko block remove","does":"removes a block"},{"command":"oriko block move","does":"moves a block, or pins it to a page"}]}}
```

A group without its action lists the actions; [the CLI page](../docs/cli.md) shows every kind of
answer.

## Connections

- **Uses:**
  - [classic/](../classic/README.md): imports `docx.ts`, `photo.ts`
  - [core/](../core/README.md): imports `cv.schema.ts`, `files.limits.ts`, `home.ts`, `issues.ts`,
    `load.ts`, `options.ts`, `place.ts`, `sources.ts`
  - [cv/](../cv/README.md): imports `init.ts`, `list.ts`, `show.ts`
  - [edit/](../edit/README.md): imports `commands.ts`
  - [pdf/](../pdf/README.md): imports `convert.ts`, `limits.ts`
  - [profile/](../profile/README.md): imports `list.ts`, `set.ts`, `show.ts`
  - [read/](../read/README.md): imports `documents.ts`
  - [terminal/](../terminal/README.md): imports `credits.ts`, `docx.ts`, `sheets.ts`
- **Used by:**
  - [bin/](../bin/README.md): imports `oriko.ts`

---

[← Back to the README](../README.md)
