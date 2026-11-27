# profile/

The commands for the version of your CV for one job posting.

A profile does not copy your CV. It only says what differs for one posting, such as which blocks
to hide, in which order to show them, and which bullets to shorten or reword. It never changes a
fact: a job keeps its dates, employer, title, place and its position among the jobs; a list, a
rated block or an entries block keeps only the master's items; and a level never rises. This
folder stores a profile after checking it against its master CV, shows a stored profile with the
posting it was made for, and lists every profile with whether it fits its pages. All three run on
the toolkit `@honeyglass/adx`.

A new block in the master, and every field a profile leaves alone, reach every profile on their
own. A field the profile sets, such as a job's bullets, keeps the profile's version. A profile is
refused once it names a block or an item the master no longer holds.

## Modules

- `set.ts`: checks a profile against its CV, stores it, and names each part it adds, changes or
  removes; a stored profile is replaced only with `--replace`.
- `show.ts`: shows a stored profile and the job posting that `oriko read` stored for it.
- `list.ts`: lists the profiles with their CV and says whether each fits its pages.
- `issues.ts`: the refusal of a `profile set` that names no field of a profile, only its name.

## Example

```sh
oriko profile set --profile acme --json '{"cv":"jane-doe","blocks":{"awards":{"hidden":true}}}'
echo '{"cv":"jane-doe","order":["awards"]}' | oriko profile set --profile acme --replace --json -
oriko profile show --profile acme
oriko profiles
```

`oriko schema profile set` shows the input it takes. A profile piped to stdin needs `--json -`.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `check.ts`, `cv.schema.ts`, `errors.ts`, `files.limits.ts`,
    `home.ts`, `issues.ts`, `load.ts`, `place.ts`, `sources.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `list.ts`, `set.ts`, `show.ts`

---

[← Back to the README](../README.md)
