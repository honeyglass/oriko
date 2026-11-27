# edit/

The commands that change a master CV, one small step at a time.

Instead of editing the JSON file by hand, a person or an agent changes one thing per call: a
block such as a job, an item inside a block such as a bullet or a skill, a contact line, or the
CV's own fields such as its language, pages and person. Each change is checked before it is
written, and the answer says whether the CV still fits its pages.

Small, checked steps catch a mistake where it happens. A change that makes the CV too long is
still written, so the next step can fix it.

## Modules

- `save.ts`: applies one edit to a stored CV, writes it back, and says whether the CV still fits
  its pages.
- `apply.ts`: makes one change to a CV, such as to a block, an item, the person or a contact line,
  and refuses a change that would break the CV.
- `issues.ts`: the refusals for an unknown command, a move without a place, a wrong anchor, and an
  index past the end of a list.
- `edit.schema.old.ts`: describes the input each edit command takes.

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
    `files.ts`, `home.old.ts`, `issues.old.ts`, `place.old.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `edit.schema.old.ts`, `save.ts`

---

[← Back to the README](../README.md)
