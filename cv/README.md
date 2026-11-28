# cv/

The commands for your master CVs: create one, list them, and look inside one.

A master CV is the full record of your career: every job, skill and contact line. You keep one
per language or per person, and every version for a job posting starts from it. This folder
creates a new, empty master that names the shared placeholder photo `placeholder.png` of the data
folder, copied once from `assets/`, lists the masters with whether each fits its pages, and shows
the outline of one master or one of its blocks in full. All three run on adx.

Changing a master happens in `edit/`; tailoring it to a posting happens in `profile/`. The hints
that send a refusal of another folder here, such as `NO_CV` to `init`, stand in `cli/hints.ts`.

## Modules

- `init.ts`: creates an empty master CV from a name, a language and a person, and writes the
  shared placeholder photo when the data folder lacks it.
- `list.ts`: lists the master CVs and says whether each fits its pages.
- `show.ts`: shows the outline of one master CV, or one of its blocks in full.
- `issues.ts`: the refusal when a CV of that name already exists.

## Example

```sh
oriko init --cv eva --json '{"language":"en","firstName":"Eva","lastName":"Roth","role":"Analyst"}'
oriko cvs
oriko show --cv jane-doe
oriko show --cv jane-doe --block awards
```

`show` with `--profile` outlines the CV that profile is made from.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `check.ts`, `cv.limits.ts`, `cv.schema.ts`, `home.ts`,
    `issues.ts`, `load.ts`, `options.ts`, `place.ts`, `sources.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `init.ts`, `list.ts`, `show.ts`

---

[← Back to the README](../README.md)
