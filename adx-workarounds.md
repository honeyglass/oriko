# adx workarounds

Each place where oriko on adx meets a gap of adx: what oriko builds around it with what adx
offers, the code of its own it keeps, or the behavior it loses, and the golden differences of
each move, with their sources.

- W1 core/issues.ts:136
  gap: a tool cannot raise `SCHEMA` itself; adx owns the code, and only `check()` raises it,
  against a schema (decision 78, guide "Input that has parts")
  call: `oriko plan --profile climb`, whose field `cv` fails its schema
  today: `SCHEMA` at `cv`, hint "Run the command for the accepted shape", command
  `oriko schema profile --home …`
  now: `SCHEMA` at `profile.cv` with adx's hint and the command `oriko schema profile`; the issue
  of oriko's own check (`core/check.ts`, which the old shell still calls) is raised again through
  `check()` with `z.never(message)` and `{ as: Profile }`, or `{ as: Master }` for the CV, and
  the tool lists both shapes
  proposal: a tool can raise `SCHEMA` at a path with its own message and name the shape it shows
  kind: workaround
  golden: no difference
- W2 core/load.ts:90
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet"), and a
  stored file read through a root answers adx's refusals, which stand at no field (guide
  "Reading a file")
  call: `oriko plan --profile badjson`, and `oriko plan --profile big` with 1,100,000 bytes
  today: `INVALID_JSON`, kind `fix`, path `""`; and `INPUT_TOO_LARGE`, kind `fix`, path
  `profile`
  now: `STORED_INVALID`, kind `ask`, no path, message "profiles/badjson.json holds no JSON"; and
  `STORED_INVALID`, kind `ask`, no path. The byte limit `FILE_LIMITS.inputBytes` stays
  proposal: the issue of a stored file stands at the field of the call that names the file
  kind: loss
  golden: no difference
- W3 core/load.ts:41
  gap: a path cannot point into a stored file on its own; it starts with a field of the call
  (decision 69, proto/oriko README "What does not fit yet")
  call: `oriko plan --home FOLDER` on a data folder without a CV
  today: `NO_CV` at `home`
  now: `NO_CV` raised with `.issue()`, with no path
  proposal: a path can start at a root, for a folder no field of the call names
  kind: loss
  golden: no difference
- W4 core/load.ts:41
  gap: a handler cannot see the folder of a root: the type `Root` of adx answers its name, its
  files and a list, and no path (guide "Reading a file")
  call: `oriko plan` on a data folder without a CV
  today: `NO_CV` at `home`, message "The data folder /…/.oriko holds no CV", or "does not exist"
  for a missing folder
  now: no path, message "The data folder holds no CV" for both; no call of `plan` answers which
  folder was searched, since `plan --help` names `ORIKO_HOME` and no path
  proposal: a handler can ask a root for the place it lies at, to show it in a message
  kind: loss
  golden: no difference
- W5 core/sources.ts:12
  gap: one source answers both the list of an option given without a value and the check of a
  value the call gives (guide "Options and their values")
  call: `oriko plan --profile acme --cv` with the CVs `erika` and `jane` stored
  today: the values `["jane"]`, only the CV the profile names
  now: every stored CV, `erika` and `jane`; `cvChoices` lists them all, since a narrowed list
  would refuse `--cv erika --profile acme` with `NOT_IN_LIST` in place of `CV_MISMATCH`
  proposal: a source can answer the list of an option apart from the check of a value
  kind: loss
  golden: no difference
- W6 core/home.ts:21
  gap: `root.list()` answers regular files only, and a walk and a list follow no link (adx
  `src/files/handle.ts:12`, guide "A command that changes something"); everything in the data
  folder that is no regular file is passed over
  call: `oriko plan --home …/inlink`, where `cvs/jane.json` is a link to `store/jane.json`
  inside the data folder
  today: `oriko cvs` lists jane with `fits: true`, and the old shell reads her, as `oriko preview
  --home …/inlink` still does. A folder
  or a pipe at `cvs/NAME.json` is refused with `NOT_A_FILE` at `cv`. A regular file `cvs`
  (`--home …/flat`) is refused with `PATH_REFUSED` at `home`, ENOTDIR in the message. A link at
  `cvs/NAME.json` that leads out of the data folder counts as a CV
  now: `NO_CV`; with another CV stored, the linked one is left out of the list and `--cv jane`
  is `NOT_IN_LIST`. A folder or a pipe at `cvs/NAME.json` is left out of the list the same way.
  A regular file `cvs` answers `NO_CV`, whose hint sends the caller to create a CV. A link that
  leads out of the data folder is passed over: that one is a check adx adds, not a loss
  proposal: `list()` answers a link whose target is a regular file inside the root, and a folder
  of a root that is no folder is refused instead of counted as empty
  kind: loss
  golden: no difference
- W7 core/options.ts:13
  gap: `--cv` and `--profile` are no global input, since a global field with a source would
  refuse the new name `init` takes (proto/oriko README "What does not fit yet")
  call: `oriko plan --cv jane`
  today: the plan of jane
  now: the same; each command puts the fields `cv` and `profile` of `core/options.ts` into its
  own input, with the sources of `core/sources.ts`
  proposal: one command can take a global field without its source
  kind: workaround
  golden: no difference
- W8 core/sources.ts:14
  gap: a tool cannot give a code of adx a hint, and a value outside the list of a field is adx's
  `NOT_IN_LIST` (proto/oriko README "A value outside a list is `NOT_IN_LIST`")
  call: `oriko plan --profile acme` in a data folder with a CV and without a profile
  today: `UNKNOWN_PROFILE` at `profile`, hint "Run the command for the shape of a profile, then
  store one with oriko profile set", command `oriko schema profile set`
  now: `NOT_IN_LIST` at `profile`, whose command `oriko plan --profile` answers an empty list;
  the pointer to `oriko profile set` is gone
  proposal: a source can name a step for an empty list, which adx then gives the issue as its
  command
  kind: loss
  golden: no difference
- W9 core/issues.ts:120
  gap: adx fills the command of an issue below a field from the source of that field (decision
  69, "adx fills `command` from the source of the first part")
  call: `oriko plan --home FOLDER --cv jane` on a CV with `"pages": 1` and more than one page of
  blocks
  today: `PAGE_OVERFLOW` at `pages`, with no command; `ROLE_TOO_LONG` at `person.role` the same
  now: `PAGE_OVERFLOW` at `cv.pages` with the command `oriko plan --home FOLDER --cv`, a list of
  CV names that does not help with the fix; `ROLE_TOO_LONG` at `cv.person.role` the same
  proposal: adx fills the list command only for an issue at the field itself, not below it
  kind: loss
  golden: no difference

## Passing outside the golden

What holds only between two packages, and the package that ends it.

- `NO_CV` has no command, where the old shell names `oriko schema init`, and its hint still says
  "run the command". Call: `plan` on a data folder without a CV. Package 7 adds the hint to
  `init`.
- `UNKNOWN_BLOCK` and `UNKNOWN_CV` inside a profile carry adx's command `oriko plan … --profile`,
  a list of profiles, while their hints promise block ids and CV names. Calls:
  `plan --profile broken`, `plan --profile ghost`. Package 7 adds the hints to `show` and `cvs`.
- A `SCHEMA` issue inside a patch of a block in a profile names `oriko schema profile`, where the
  old shell names `oriko schema block`. Call: `plan --profile NAME` whose patch of a block fails
  its schema. The command names `oriko schema block` again once the check of a profile runs
  through adx's `check()` with the real shapes, in the package that moves `core/check.ts` onto
  adx.
- `ORIKO_HOME` moves the data folder of the moved commands only; the old shell does not read it.
  Package 9 ends it.
- An option before `plan` (`--home X plan`) is refused with `OPTION_BEFORE_COMMAND`, while the
  old shell takes it before a command that is not moved. Package 9 ends it.

## Golden changes

Every record that differs from the golden before the move, by its call number in the golden.

| Calls | Call | What changed | Source |
| --- | --- | --- | --- |
| 41, 42, 65 | `plan`, `plan --profile acme`, `plan --cv=jane` | the plan stands in `result`; `next` is gone | listed: README "One answer shape"; passing: the steps to `preview` and `build` come with them |
| 43 | `plan --profile broken` | refusal without `step`, `reason`, `next`, state "Nothing was changed."; path `profile.blocks.nobody`; command `oriko plan --profile` | adx's own: guide "The answer"; listed: decision 69; passing: the hint of `UNKNOWN_BLOCK` names `show` |
| 44 | `plan --profile` | `{ ok, result: { option, values: [{ value }] } }` | adx's own: guide "Options and their values" |
| 63 | `plan --dry-run` | refusal without `step`, `reason`, `next`, state "Nothing was changed."; `UNKNOWN_OPTION` in place of `OPTION_NOT_ALLOWED`, adx's wording | adx's own: guide "The answer", "A command that changes something", "How adx reads a call" |
| 64 | `plan --cv jane --cv jane` | refusal without `step`, `reason`, `next`, state "Nothing was changed."; adx's `REPEATED_OPTION`, with the command `oriko schema plan` | adx's own: guide "The answer", "How adx reads a call" |
| 66 | `plan -- --cv` | refusal without `step`, `reason`, `next`, state "Nothing was changed."; two `UNEXPECTED_ARGUMENT` issues, at `--` and at `--cv`, adx's wording | adx's own: guide "The answer", "How adx reads a call" |
| 67 | `plan --cv nope` | refusal without `step`, `reason`, `next`, state "Nothing was changed."; `NOT_IN_LIST` with the command `oriko plan --cv`, in place of `UNKNOWN_CV` | adx's own: guide "The answer"; listed: README "A value outside a list is `NOT_IN_LIST`" |
| 71 | `plan --profile broken --output text` | adx's text form; path `profile.blocks.nobody`; command `oriko plan --profile` | adx's own: guide "Run it"; listed: decision 69; passing: the hint of `UNKNOWN_BLOCK` names `show` |
| 79 | `plan` with two CVs | refusal shape; the command of `CV_REQUIRED` is `oriko plan --cv` | adx's own: guide "The answer", "Commands adx names" |
| 80 | `plan --cv erika --profile acme` | refusal shape; `CV_MISMATCH` gets the command `oriko plan --profile acme --cv` | adx's own: guide "The answer", "Commands adx names" |
| 126 | `plan --help` | exit 0 with what `plan` takes, in place of `UNKNOWN_OPTION` | adx's own: guide "What every tool gets" |
