# ⌨️ CLI

## Agent DX rules

oriko follows 15 of the [16 Agent DX rules of adx](https://github.com/honeyglass/adx#-the-16-agent-dx-rules),
which names where each rule comes from. The rules marked ➕ oriko are new: the author of oriko added
them from building tools for agents.

| Rule | What oriko does | Why it helps the agent | Source |
| :--- | :--- | :--- | :--- |
| Raw JSON input | takes its whole input as one JSON object | passes the data as it is, without many flags | article |
| Schema at runtime | `oriko schema` shows every command and its input | looks the format up in the tool itself | article |
| JSON when piped | text for people, JSON for programs | each reader gets what it can read | article |
| Input hardening | the Word file and photos stay inside their folder | a mistake never writes elsewhere | article |
| Dry runs | `--dry-run` says what would happen | tries a command safely first | article |
| Agent skill | the agent's manual ships with the code | knows when to stop and ask you | article |
| Checks in layers | shape, then version, then pages; all errors at once | fixes real errors in one go | ➕ oriko |
| Errors with a hint | each error says where and what to change | fixes the input on its own | ➕ oriko |
| All or nothing | a refused command writes nothing | no file is left half changed | ➕ oriko |
| Exit codes 0, 1, 2 | 0 ok, 1 fix the input, 2 something broke | knows the next step from one number | ➕ oriko |
| Plan before the file | `plan` shows which block lands on which page | fixes an overflow before building | ➕ oriko |
| Hints that run | a refusal names the command that lists the fitting values | runs it and picks a real value | ➕ oriko |
| Options that list | an option without a value lists the values it accepts | finds names and ids in one call | ➕ oriko |
| Next steps | a success names its next commands, when there are any, and what each still needs | always knows where to go on | ➕ oriko |
| Nothing passes silently | an unknown command, option or word is refused, a group alone lists its actions | never acts on a typo | ➕ oriko |

## Commands

Every command answers one JSON object: on one line when another program reads it, indented in a
terminal, where `preview` shows its sheets and a refusal shows as readable lines. oriko ends with
exit code 0 when all went well, 1 when the input needs a fix (each issue with a hint), and 2 when
something broke. `oriko schema` lists every command and option, `oriko schema <command>` the input
one accepts, in `required` the options it cannot run without, and in `requiredWith` the options
another option needs beside it, such as `--profile` beside `--posting` for `read`. A call that
leaves out a required option is refused before the command runs, with the command that lists
what the option may hold.

| Command | What it does |
| :--- | :--- |
| `cvs`, `profiles` | list your CVs and versions, and whether each one fits its pages |
| `show` | outline of a CV; `--block <id>` shows one block in full |
| `plan`, `preview` | the page plan as JSON, or as the sheets of the terminal preview; `preview --credits` adds who made the CV |
| `build --out <file>.docx` | writes the Word file, or with `<file>.pdf` its PDF through LibreOffice; `--style terminal` in the look of the preview, with `--credits` naming oriko and its author on the last page, `--dry-run` writes nothing |
| `init`, `cv update` | create a CV, change its language, pages, person or contact title |
| `block …`, `item …`, `contact …` | add, update, remove and move blocks, their items and contact lines |
| `photo set --file <file>` | stores a PNG or JPEG as the square photo of a CV, or of one version; a stored photo is replaced only with `--replace` |
| `read` | reads a posting (`--posting`, with `--profile`), notes (`--notes`) or an old CV (`--resume`) |
| `profile set`, `profile show` | stores the version for one posting, checked against its CV, and shows it with its posting |

`read` takes a file or an `https://` address and answers its text. By design the file may sit at
any path oriko can read, inside the working directory or not; a relative path starts at the
working directory. The posting is stored as `profiles/<profile>.posting.md`, notes are added to
`cvs/<cv>.notes.md` of the CV the profile or `--cv` names, and an old CV is stored nowhere. The
answer names the file of each in `posting` and `notes`. A stored posting is replaced only with
`--replace`; the same posting again writes nothing and says `"unchanged": true`. The kind comes
from the content: PDF, Word, HTML or UTF-8 text; any other is refused. A download goes only to a
public address over https on port 443, at every redirect, and each document stops at a size
limit. Every character that does not show as itself becomes a space. A source that cannot be read
is refused at the option that names it, with a code of its own such as `SOURCE_NOT_FOUND` or
`ADDRESS_NOT_ALLOWED`; a failed download is `DOWNLOAD_FAILED` or `SITE_BUSY`, of kind `retry`.

> [!WARNING]
> `read --dry-run` reads and downloads its sources as the real run does; it only writes nothing.

`profile set` takes the whole version as JSON and runs the checks of `plan` before it writes, so
a refused version is never stored. An existing version is replaced only with `--replace`; the
same version again writes nothing and says `"unchanged": true`. The answer names the file, each
part it adds, changes or removes in `changes`, with `--dry-run` too, and whether the CV fits its
pages with it. A version piped to stdin needs `--json -`; a call that names no field of a version
is refused with `NOTHING_TO_STORE`.

When another program reads the output instead of a terminal, `preview` answers JSON with the
sheets in `result.preview`. Add `--output text` to get the plain sheets there too, with the
`Next:` lines below them.

`build` answers the file it wrote in `result`: `file` relative to the working directory, `bytes`,
`replaces`, `style` and `pages`. The file is built again from the CV each time, so `build`
replaces it without `--replace`, writes nothing when it holds the same bytes (`unchanged: true`),
and creates a missing folder of `--out`. `--out` is a relative path inside the working directory;
a link there to another file is refused with `TARGET_NOT_A_FILE`, as is one at a stored profile,
photo, posting or notes, so a write never changes the file a link leads to.

`init` writes the new CV as `cvs/<cv>.json` and never replaces one: a name that is taken is
refused with `CV_EXISTS`. Every new CV names the one placeholder photo `placeholder.png` of the
data folder, which `init` writes once, when it is missing, so the first `photo set` of the CV
needs no `--replace`.

> [!WARNING]
> A CV made by an older oriko holds its own placeholder at `cvs/<cv>.png`, so its first
> `photo set` needs `--replace`.

`oriko` alone answers where to start: the data folder, its CVs and its profiles. A group without
its action lists the actions, such as `oriko block` for `block add`, `block update`, `block remove`
and `block move`. A command takes only its own options and words; anything else is refused, with
every mistake of the call in one answer.

A success names what can follow in `next`, when anything can, with what each step still needs. At
a terminal the steps print as `Next:` lines below the answer. Piped text, with `--output text`,
leaves them out for a command on the old shell, and prints them for a command on adx, such as
`plan`, `preview` and `build`.

An edit, such as
`oriko block update --cv jane-doe --json '{"id":"awards","set":{"title":"Prizes"}}'`, answers the
CV file it changed, what changed in it, and whether the CV still fits its pages. An edit that
leaves the CV as it is writes nothing and says `"unchanged": true`. JSON always holds the steps:

```json
{
  "ok": true,
  "applied": true,
  "result": {
    "file": "cvs/jane-doe.json",
    "bytes": 7901,
    "replaces": true,
    "changes": { "added": ["blocks.14.title"], "changed": [], "removed": [], "more": 0 },
    "fits": true,
    "layout": []
  },
  "next": [
    {
      "does": "draws the pages in the terminal",
      "command": "oriko preview --cv jane-doe"
    },
    {
      "does": "writes the Word file, or its PDF through LibreOffice",
      "command": "oriko build --cv jane-doe",
      "needs": ["out"]
    }
  ]
}
```

After `--dry-run` the answer is the same with `"applied": false`, and the one step is the call
itself without `--dry-run`, with its data folder and every value quoted for the shell:

```json
{
  "does": "changes fields of a block",
  "command": "oriko block update --cv jane-doe --id awards --json '{\"set\":{\"title\":\"Prizes\"}}'"
}
```

A command reads stdin only with `--json -`.

oriko only names a step and never follows one. A step without `command`, such as the upload to
Google Docs after `build`, is for the person.

An option without a value lists the values it accepts:

| Call | Answer |
| :--- | :--- |
| `oriko show --cv` | the names of all CVs |
| `oriko plan --profile` | the names of all profiles |
| `oriko show --cv jane-doe --block` | the id of every block of that CV, with its kind, section and title |
| `oriko build --style` | `classic`, `terminal` |
| `oriko --output` | `json`, `text`; a command such as `oriko cvs --output` refuses with `MISSING_VALUE` and names this call |

## A refusal

A refusal the agent reads and acts on, here of `oriko preview --cv jane-doe` for a CV with
`"pages": 1` and more than one page of blocks:

```json
{
  "ok": false,
  "kind": "fix",
  "state": "Nothing was changed.",
  "issues": [
    {
      "code": "PAGE_OVERFLOW",
      "path": "cv.pages",
      "message": "These blocks of the left column land after page 1: campus, freelance, cedar",
      "hint": "Hide or shorten blocks of that column, remove a page pin, or raise \"pages\"",
      "command": "oriko preview --cv"
    },
    {
      "code": "PAGE_OVERFLOW",
      "path": "cv.pages",
      "message": "These blocks of the right column land after page 1: languages, interests, awards",
      "hint": "Hide or shorten blocks of that column, remove a page pin, or raise \"pages\"",
      "command": "oriko preview --cv"
    }
  ]
}
```

`"ok": false` means oriko refused. `"kind": "fix"` says the agent can fix the input itself;
`"kind": "ask"` says only the person can solve it, such as a full disk, so the agent stops;
`"kind": "retry"` says a later call may succeed, such as after a failed connection. Each
issue has a `code` the agent can check, a `path` to the wrong value, a `message` for people and a
`hint` on what to change.

When another command answers the values that fix an issue, the issue names it in `command`, and
the hint says to run it. The agent runs the command and picks a value from its answer:

```json
{
  "code": "UNKNOWN_CV",
  "path": "profile.cv",
  "message": "The profile names the CV jane-dough, which the data folder does not hold",
  "hint": "Run the command and set the field cv of the profile to one of the CV names it lists",
  "command": "oriko cvs"
}
```

In a terminal, the same refusal reads as lines. When your CV needs more pages than allowed, the
preview names the blocks that do not fit and says what to change:

```text
refused (fix): Nothing was changed.

PAGE_OVERFLOW at cv.pages
  These blocks of the left column land after page 1: campus
  hint  Hide or shorten blocks of that column, remove a page pin, or raise "pages"
  run   oriko preview --cv
```

The first line says that oriko refused, that the input can be fixed (`fix`), and that nothing
changed. Each block below names one problem, where it lies (`cv.pages`, the field `pages` of the
CV), and what to change.

---

[← Back to the README](../README.md)
