# cli/

The shell around oriko: it takes one call, sends it to the right feature, and gives one answer.

A call is a command with its options, such as `oriko build --profile acme --out cv.pdf`. This
folder reads the call in full, checks that the command and its options exist, routes it to the
feature that does the work, and writes the answer: one line of JSON for a program or an agent,
indented JSON or plain lines for a person. A success names the steps that can follow, when there
are any, and every refusal says what to fix.

It is the only folder that combines several features. A build, for example, uses the page plan
from `core/`, the classic or terminal style (`--style`) from `classic/` or `terminal/`, and `pdf/`
for the PDF.

oriko moves onto the toolkit `@honeyglass/adx` one command at a time. A command in the table of
`oriko.ts`, today `plan`, `preview`, `build`, the profile commands of `profile/`, `photo set` and
the edits of `edit/`, is read,
checked and answered by adx in the one answer shape adx gives every tool; every other call still
goes through the shell described here.

## Modules

- `run.ts`: runs one call from start to end and ends with its exit code.
- `args.ts`: reads every argument of a call, so one answer can name all its mistakes at once.
- `commands.ts`: the one table of all commands, with what each does, its options and its input.
- `route.ts`: picks the command a call names, refuses an option or word it does not take, and
  refuses a call that leaves out an option the command requires.
- `dispatch.ts`: hands a checked call to the feature that does the work.
- `input.ts`: reads the JSON input of a command from `--json` or from stdin.
- `values.ts`: lists the values an option accepts when it is given without one, such as `--cv`.
- `build.ts`: runs `preview` and `build` on adx, which need the page plan, a style and maybe the
  PDF; `build` writes its file inside the working directory.
- `describe.ts`: answers `oriko schema` with the commands, the options and the input shapes.
- `complete.ts`: adds the next steps to an answer, and the `--home` of the call to each command
  in it, so the command runs as it stands.
- `answer.ts`: writes the answer as JSON for a program or as text for a person.
- `types.ts`: the types the modules share: a call, its surroundings and the fields of an answer.
- `issues.old.ts`: the mistakes the shell itself refuses, such as an unknown option or command.
- `next.old.ts`: picks the next steps that follow a successful answer.
- `interim.ts`: decides whether a call goes to adx or to the old shell, by the command it names.
- `oriko.ts`: the tool on adx: its name, its folders and the table of the commands that moved.
- `plan.ts`: runs `plan` on adx: it checks the CV and its profile and places every block.
- `issues.ts`: the errors of `build` on adx: an `--out` file that is no .docx or .pdf, and
  `--credits` without the terminal style.
- `next.ts`: names the steps on adx that lead from a feature into `cli/`, such as `build` after
  `photo set`, `plan` after `profiles`, and `preview` and `build` after an edit or a stored
  profile that leaves the CV fitting its pages.

## Example

```sh
oriko block --output json
```

```json
{"ok":true,"command":"block","values":["block add","block update","block remove","block move"]}
```

A group without its action lists the actions; [the CLI page](../docs/cli.md) shows every kind of
answer.

## Connections

- **Uses:**
  - [classic/](../classic/README.md): imports `docx.ts`, `photo.ts`
  - [core/](../core/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `home.old.ts`, `home.ts`, `issues.old.ts`, `issues.ts`, `load.old.ts`,
    `load.ts`, `options.old.ts`, `options.ts`, `place.ts`, `sources.ts`
  - [cv/](../cv/README.md): imports `init.ts`, `list.ts`, `show.ts`
  - [edit/](../edit/README.md): imports `commands.ts`, `edit.schema.old.ts`
  - [pdf/](../pdf/README.md): imports `convert.ts`, `limits.ts`
  - [profile/](../profile/README.md): imports `list.ts`, `set.ts`, `show.ts`
  - [read/](../read/README.md): imports `documents.ts`, `limits.ts`, `web.ts`
  - [terminal/](../terminal/README.md): imports `credits.ts`, `docx.ts`, `sheets.ts`
- **Used by:**
  - [bin/](../bin/README.md): imports `interim.ts`, `oriko.ts`, `run.ts`

---

[← Back to the README](../README.md)
