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
| `photo set <file>` | stores a PNG or JPEG as the square photo of a CV, or of one version |
| `read` | reads a posting (`--posting`, with `--profile`), notes (`--notes`) or an old CV (`--resume`) |
| `profile set`, `profile show` | stores the version for one posting, checked against its CV, and shows it with its posting |

`read` takes a file or an `https://` address and answers its text. By design the file may sit at
any path oriko can read, inside the working directory or not. The posting is stored as
`profiles/<profile>.posting.md`, notes are added to `cvs/<cv>.notes.md`, and an old CV is stored
nowhere. The kind comes from the content: PDF, Word, HTML or UTF-8 text; any other is refused. A
download goes only to a public address over https on port 443, at every redirect, and each
document stops at a size limit. Every character that does not show as itself becomes a space.

`profile set` takes the whole version as JSON and runs the checks of `plan` before it writes, so
a refused version is never stored. An existing version is replaced only with `--replace`, and the
answer names each part it adds, changes or removes, with `--dry-run` too.

When another program reads the output instead of a terminal, `preview` answers JSON with the
sheets in its field `preview`. Add `--output text` to get the plain sheets there too.

`oriko` alone answers where to start: the data folder, its CVs and its profiles. A group without
its action lists the actions, such as `oriko block` for `block add`, `block update`, `block remove`
and `block move`. A command takes only its own options and words; anything else is refused, with
every mistake of the call in one answer.

A success names what can follow in `next`, when anything can, with what each step still needs. At
a terminal the steps print as `Next:` lines below the answer; piped text leaves them out, and JSON
always holds them:

```json
{
  "ok": true,
  "command": "block update",
  "written": true,
  "fits": true,
  "next": [
    {
      "does": "draws the pages in the terminal",
      "command": "oriko preview --cv jane-doe"
    },
    {
      "does": "writes the Word file",
      "command": "oriko build --cv jane-doe",
      "needs": ["out"]
    }
  ]
}
```

After `--dry-run` the one step is the call itself without `--dry-run`, with its data folder and
every value quoted for the shell; an input that came through stdin is not part of the call, so
that step names `json` in `needs`:

```json
{
  "ok": true,
  "written": false,
  "next": [
    {
      "does": "repeat the call without --dry-run to write",
      "command": "oriko build --profile go-e --out go-e.docx"
    }
  ]
}
```

oriko only names a step and never follows one. A step without `command`, such as the upload to
Google Docs after `build`, is for the person.

An option without a value lists the values it accepts:

| Call | Answer |
| :--- | :--- |
| `oriko show --cv` | the names of all CVs |
| `oriko plan --profile` | the names of all profiles |
| `oriko show --cv jane-doe --block` | the outline of every block of that CV |
| `oriko build --style` | `classic`, `terminal` |
| `oriko preview --output` | `json`, `text` |

## A refusal

A refusal the agent reads and acts on:

```json
{
  "ok": false,
  "kind": "fix",
  "issues": [
    {
      "code": "PAGE_OVERFLOW",
      "path": "pages",
      "message": "These blocks of the left column land after page 1: campus",
      "hint": "Hide or shorten blocks of the left column, remove a page pin, or raise \"pages\""
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
  "path": "cv",
  "message": "The data folder has no CV jane-dough",
  "hint": "Run the command and use one of the CV names it lists",
  "command": "oriko show --cv"
}
```

In a terminal, the same refusal reads as lines. When your CV needs more pages than allowed, the
preview names the blocks that do not fit and says what to change:

```text
Refused (fix) at place: the input has 2 issue(s).
Next: fix every listed issue and call again.
Nothing was written.
- PAGE_OVERFLOW at pages: "These blocks of the left column land after page 1: campus". Hide or shorten blocks of the left column, remove a page pin, or raise "pages".
```

The first line says that oriko refused, that the input can be fixed (`fix`), and at which step
(`place`, the page planning). Each line that starts with `-` names one problem and what to change.

---

[← Back to the README](../README.md)
