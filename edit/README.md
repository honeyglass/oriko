# edit/

The commands that change a master CV, one small step at a time.

Instead of editing the JSON file by hand, a person or an agent changes one thing per call: a
block such as a job, an item inside a block such as a bullet or a skill, a contact line, or the
CV's own fields such as its language, pages and person. Each change is checked before it is
written, and the answer names the file, what changed in it, and whether the CV still fits its
pages. A change that leaves the CV as it is writes nothing and says `unchanged`.

Small, checked steps catch a mistake where it happens. A change that makes the CV too long is
still written, so the next step can fix it.

## Modules

- `save.ts`: applies one edit to a stored CV, stages the file for writing back, and says whether
  the CV still fits its pages.
- `apply.ts`: makes one change to a CV, such as to a block, an item, the person or a contact line,
  and refuses a change that would break the CV, at the part of the input that names it.
- `issues.ts`: the refusals for a move without a place, a wrong anchor, and an index past the end
  of a list.
- `block.ts`: the commands that add, change, remove and move a whole block.
- `commands.ts`: the four groups of commands this folder adds to the tool: block, item, cv and
  contact.
- `contact.ts`: the commands that add, change, remove and move a contact line.
- `cv.ts`: the command that changes the language, the pages, the person or the contact title.
- `edit.schema.ts`: the input of each edit command: the CV it changes and the change itself.
- `item.ts`: the commands that add, change, remove and move one item inside a block.

## Example

```sh
oriko block move --cv jane-doe --json '{"id":"awards","page":2}'
oriko item add --cv jane-doe --json '{"block":"tools","value":"Docker"}'
oriko contact remove --cv jane-doe --json '{"index":0}' --dry-run
oriko cv update --cv jane-doe --json '{"person":{"role":"Staff Engineer"}}'
```

`oriko schema block move` shows the input of one command; [the CLI page](../docs/cli.md#commands)
lists them all.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `home.ts`, `issues.ts`, `load.ts`, `options.ts`, `place.ts`, `sources.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `commands.ts`

---

[← Back to the README](../README.md)
