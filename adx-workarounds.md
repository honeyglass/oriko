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
  today: `oriko cvs` lists jane with `fits: true`, and the old shell reads her, as `oriko show
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
- W10 pdf/convert.ts:56
  gap: adx runs no program of the system and hands a handler no way to find one, and its test kit
  stands in only for the servers of remotes (proto/oriko README "LibreOffice runs outside adx",
  guide "Testing your tool")
  call: `oriko build --out cv.pdf`
  today: oriko's own code finds soffice among `sofficePaths()`, which on Windows builds its places
  from the variables `PROGRAMFILES` and `PROGRAMFILES(X86)`. It runs the program with a temporary
  folder from `tmpdir()`, which follows `TMPDIR`, and hands LibreOffice the whole environment plus
  `FONTCONFIG_FILE`. A test passes the path of a fake program in through `Space.soffice`
  now: the same code, with the same three uses of the environment, which stay as kept own code.
  The one place that finds the program is `libreOffice.program`.
  In a test: the test replaces `libreOffice.program` in its own process with `mock.method`, so
  `build` runs through `run` of the test kit, and no variable of the test names the program
  proposal: a tool can declare a program it runs, found among a list of places, and the test kit
  can stand in for it as it does for a server
  kind: kept own code
  golden: no difference
- W11 classic/docx.ts:62
  gap: a root is a folder of the person; the files a package ships lie in none (proto/oriko README
  "Two files of the package lie in no root")
  call: `oriko build --out cv.docx`, and `oriko build --out cv.pdf` for the fonts
  today: the icons under `assets/` and the fonts under `assets/fonts` are read with node:fs
  now: the same, by oriko's own code; the fonts reach LibreOffice through its font configuration
  (pdf/convert.ts:89)
  proposal: a tool can declare a read-only root for the files it ships
  kind: kept own code
  golden: no difference
- W12 cli/build.ts:149
  gap: a file read through a root answers adx's refusals, which stand at no field, and a file past
  the limit is `STORED_INVALID` (guide "Reading a file")
  call: `oriko build --profile piped --out p.docx --dry-run`, whose profile names `cvs/pipe.png`, a
  pipe
  today: `NOT_A_FILE` at `person.photo`; a missing photo `FILE_NOT_FOUND`, a link out of the data
  folder `PATH_OUTSIDE`, a photo past 20,000,000 bytes `INPUT_TOO_LARGE` of kind fix, each at
  `person.photo`
  now: `NOT_A_FILE`, `FILE_NOT_FOUND` and `PATH_OUTSIDE` with no path, in adx's words, such as
  "cvs/pipe.png is no file"; a photo past the limit `STORED_INVALID`, kind ask, no path. The byte
  limit `FILE_LIMITS.photoBytes` stays
  proposal: the issue of a file that a stored value names stands at the field of the call that named
  the stored file, below it at the path of the value
  kind: loss
  golden: no difference
  same gap as: W2
- W13 classic/docx.ts:135
  gap: adx fills the command of an issue below a field from the source of that field (decision 69,
  "adx fills `command` from the source of the first part")
  call: `oriko build --profile bad --out p.docx`, whose profile names a photo that is no picture
  today: `PHOTO_UNREADABLE` at `person.photo`, with no command
  now: `PHOTO_UNREADABLE` at `profile.person.photo`, or `cv.person.photo` for the photo of the CV
  (decision 69), with the command `oriko build --out p.docx --profile`, a list of profiles that does
  not help with the fix
  proposal: adx fills the list command only for an issue at the field itself, not below it
  kind: loss
  golden: no difference
  same gap as: W9
- W14 cli/build.ts:63
  gap: a path field of a root takes a path relative to the root only; an absolute path is
  `PATH_OUTSIDE` also when it leads inside the root (adx `src/files/paths.ts`, `partsOf`; guide
  "Files the call names")
  call: `oriko build --out "$PWD/cv.docx"`
  today: writes `cv.docx` into the working directory and answers `out: "cv.docx"`
  now: `PATH_OUTSIDE` at `out`, "… leads out of the root work"
  proposal: a path field takes an absolute path whose real place lies inside the root, and answers
  it relative to the root
  kind: loss
  golden: no difference
- W15 cli/build.ts:97
  gap: adx answers a system error of a write as `SYSTEM_REFUSED`, kind ask, at no field, whatever
  the error (guide "Files the call names", "A full disk")
  call: `oriko build --out sealed/cv.docx`, where `sealed` is a folder the caller may not write to
  today: `PATH_REFUSED` at `out`, kind fix, "The system refused …/sealed/cv.docx: EACCES"
  now: `SYSTEM_REFUSED`, kind ask, no path, "open of …/sealed/.<uuid>.adx-tmp failed with EACCES";
  the agent stops and asks the person where it could pass another `--out`
  proposal: a system error on a path the input names stands at that field, and its kind follows who
  can solve it: a missing right for the caller, a full disk for the person
  kind: loss
  golden: no difference
- W16 cli/build.ts:63
  gap: adx resolves the target of a write before it stages the file, and a link at the target that
  leads nowhere fails there (adx `src/files/paths.ts`, `target`)
  call: `oriko build --out loop.docx --dry-run`, where `loop.docx` is a link to itself
  today: exit 0; the real run replaces the link with the file, as it replaces any link at `--out`
  now: `SYSTEM_REFUSED`, kind ask, no path, "realpath of …/loop.docx failed with ELOOP"
  proposal: a link at the target of a write that leads nowhere is replaced like any other link
  kind: loss
  golden: no difference
- W17 cli/build.ts:97
  gap: a write answers its file as the call named it, cleaned, not by its real place inside the root
  (guide "Files the call names")
  call: `oriko build --out latest/cv.docx`, where `latest` is a link to the folder `reports` of the
  working directory
  today: writes `reports/cv.docx` and answers `out: "reports/cv.docx"`
  now: writes `reports/cv.docx` and answers `file: "latest/cv.docx"`; no answer names the folder the
  file landed in
  proposal: a write answers the real place of its file inside the root beside the path the call gave
  kind: loss
  golden: no difference
- W18 cli/build.ts:97
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced and adx never writes through a link (guide "Files
  the call names"; adx `src/files/paths.ts`, `linkedFile`)
  call: `oriko build --style terminal --out link.docx`, where `link.docx` is a link to `real.docx`
  of the working directory, 8 bytes with mode 600
  today: the rename replaces the link with the built file; `real.docx` stays as it was
  now: exit 0 with `"file":"link.docx"` and `"replaces":true`; `link.docx` is still the link, and
  `real.docx` holds the built file with mode 644. oriko could keep the old behavior only by reading
  the working directory itself
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: loss
  golden: no difference
  same gap as: W17
- W19 classic/images.ts:58
  gap: adx reads a file only inside a root (guide "Reading a file"; proto/oriko README "`photo set`
  has the same gap", adx TODO #6)
  call: `oriko photo set --file ~/Pictures/me.png --cv jane`
  today: the picture is read from anywhere on the disk, with the photo byte limit and the refusal of
  what is no regular file; a relative path starts at the working directory of the call
  now: the same, by oriko's own code: `squarePhoto` reads through `readBounded` of `core/files.ts`,
  with `FILE_LIMITS.photoBytes`, and resolves a relative path against the working directory of the
  process
  proposal: an allow-list of the folders the person opens, so a root can hold a file the person names
  anywhere on the disk
  kind: kept own code
  golden: no difference
- W20 classic/issues.ts:21
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet")
  call: `oriko photo set --file missing.png`, `oriko photo set --file .`, and
  `oriko photo set --file huge.png` with 20,000,001 bytes
  today: `FILE_NOT_FOUND`, `NOT_A_FILE` and `INPUT_TOO_LARGE` at `file`, kind fix
  now: `NO_PICTURE`, `PICTURE_NOT_A_FILE` and `PICTURE_TOO_LARGE` at `file`, kind fix, with the
  message and the hint of today; `PATH_REFUSED`, which adx does not own, keeps its name
  proposal: a tool can raise one of adx's codes for a file the tool's own code read, at the field that
  named the file
  kind: loss
  golden: no difference
  same gap as: W2
- W21 classic/images.ts:78
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet")
  call: `oriko photo set --file me.png`, where the read of `me.png` fails with a system error outside
  the list of `core/files.ts` that the caller fixes, such as EIO
  today: `SYSTEM_REFUSED` at `file`, kind ask, "The system refused …/me.png: EIO"
  now: the system error goes to adx with `failed`: `SYSTEM_REFUSED`, kind ask, no path, "open of
  …/me.png failed with EIO", adx's hint. Read in adx `src/core/unmapped.ts`, not measured: no test
  can make a read fail with EIO
  proposal: a tool can raise one of adx's codes for a file the tool's own code read, at the field that
  named the file
  kind: loss
  golden: no difference
  same gap as: W2
- W22 classic/photo.ts:99
  gap: a stored file read through a root answers adx's refusals, which stand at no field (guide
  "Reading a file")
  call: `oriko photo set --file me.png --profile badjson`, whose file holds `{`
  today: `INVALID_JSON`, kind fix, path `""`; a profile past 1,000,000 bytes `INPUT_TOO_LARGE` at
  `profile`
  now: `STORED_INVALID`, kind ask, no path; a profile past 1,000,000 bytes (`--profile big`,
  1,100,000 bytes) `STORED_INVALID`, kind ask, no path, "profiles/big.json holds more than 1000000
  bytes", so the byte limit `FILE_LIMITS.inputBytes` stays
  proposal: the issue of a stored file stands at the field of the call that names the file
  kind: loss
  golden: no difference
  same gap as: W2
- W23 classic/photo.ts:43
  gap: the test kit can give a probe no file outside every root: `conformance` calls each example in
  an empty working directory and copies only the seed of the data folder (guide "Testing your tool")
  call: `conformance(t, oriko, { seed })`, which probes `oriko photo set`
  today: no conformance; the old shell has no example
  now: without an example, the probe "raw JSON input" fails ("has a required field and no example,
  so no probe can call it validly") and five probes are todo. The example names the placeholder of
  the package, `assets/placeholder.png`, relative to the repository's root, for the profile `acme`
  of the seed, which has no photo of its own. It passes only while the process of the test runs in
  the repository's root, and `conformance` with the program would run it in a scratch folder
  proposal: the samples of the test kit can name files a probe finds at a plain path, such as a
  folder copied in as the working directory of each probe, against which the call resolves the path
  kind: workaround
  golden: no difference
- W24 classic/images.ts:58
  gap: adx hands a handler no working directory of the call, and `run` of the test kit sets only the
  root made with `cwd` and leaves `process.cwd()` as it is (guide "Testing your tool")
  call: `run(oriko, ['photo', 'set', '--file', 'me.png'], { cwd })` in a test
  today: the old shell resolves the picture against the working directory the test passes in
  now: the picture is resolved against the working directory of the process, so a real call is the
  same as today, and a test names the picture by its absolute path
  proposal: a handler can ask for the working directory of the call, which the test kit sets with
  `cwd`
  kind: workaround
  golden: no difference
- W25 classic/photo.ts:51
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced (guide "Files the call names"; adx
  `src/files/paths.ts`, `linkedFile`)
  call: `oriko photo set --file me.png --replace`, where `cvs/jane.png` is a link to
  `store/jane.png` of the data folder
  today: the rename replaces the link with the photo; `store/jane.png` stays as it was
  now: exit 0 with `"file": "cvs/jane.png"`; `cvs/jane.png` is still the link, and `store/jane.png`
  holds the photo. The link may name any stored file: with `profiles/acme.png` a link to
  `../cvs/jane.json`, `oriko photo set --file placeholder.png --profile acme` is `ALREADY_EXISTS`,
  and with `--replace` it answers exit 0 with `"photo":{"file":"profiles/acme.png",
  "replaces":true}`, and `cvs/jane.json` holds the PNG: a stored CV is replaced by a photo, and no
  answer names it. A link that leads out of the data folder is replaced, with `--replace`, and its
  target stays as it was
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: loss
  golden: no difference
  same gap as: W17
- W26 edit/apply.ts:84
  gap: adx fills the command of an issue below a field from the source of that field (decision
  69, "adx fills `command` from the source of the first part")
  call: `oriko cv update --json '{"pages":3}'` on a CV that holds two blocks with the id `awards`
  today: `DUPLICATE_ID` at `blocks.awards`, with no command; `UNTITLED_NOT_ALONE` the CV holds
  before the edit the same
  now: `DUPLICATE_ID` at `cv.blocks.awards` with the command `oriko cv update --pages 3 --cv`, a
  list of CV names that does not help with the fix
  proposal: adx fills the list command only for an issue at the field itself, not below it
  kind: loss
  golden: no difference
  same gap as: W9
- W27 edit/save.ts:46
  gap: adx answers a system error of a write as `SYSTEM_REFUSED`, kind ask, at no field, whatever
  the error (guide "Files the call names", "A full disk")
  call: `oriko block remove --json '{"id":"awards"}'`, where `cvs` of the data folder is a folder
  the caller may not write to
  today: `PATH_REFUSED` at `home`, kind fix, "The system refused …/cvs/jane.json: EACCES"
  now: `SYSTEM_REFUSED`, kind ask, no path, "open of …/cvs/.<uuid>.adx-tmp failed with EACCES", state
  "Nothing was changed. The temporary file was removed."
  proposal: a system error on a path the input names stands at that field, and its kind follows who
  can solve it: a missing right for the caller, a full disk for the person
  kind: loss
  golden: no difference
  same gap as: W15
- W28 edit/save.ts:52
  gap: a stored file read through a root answers adx's refusals, which stand at no field (guide
  "Reading a file")
  call: `oriko block remove --json '{"id":"awards"}'` on a data folder whose only CV `cvs/bad.json`
  holds `{`
  today: `INVALID_JSON`, kind fix, path `""`, "The file …/cvs/bad.json is not valid JSON"; a CV past
  1,000,000 bytes `INPUT_TOO_LARGE` at `cv`
  now: `STORED_INVALID`, kind ask, no path, "cvs/bad.json holds no JSON"; a CV past the limit the same
  code. The byte limit `FILE_LIMITS.inputBytes` stays
  proposal: the issue of a stored file stands at the field of the call that names the file
  kind: loss
  golden: no difference
  same gap as: W2
- W29 edit/issues.ts:26
  gap: a code has one fixed hint, declared once with `code()`, so a hint cannot name a value of
  the issue (guide "Refusing bad input with a hint"; proto/oriko README "A code has one hint")
  call: `oriko item update --json '{"block":"awards","index":2,"value":{"note":"x"}}'`, and
  `oriko block move --json '{"id":"awards","before":"northwind"}'`
  today: `INDEX_OUT_OF_RANGE` with the hint "Use an index from 0 to 1", or "The list is empty; add
  an item first"; `OTHER_COLUMN` with the hint "Use an anchor of the right column:
  programming-languages, …, interests"
  now: the values move into the message: "There is no place 2 for this edit; the edit takes the
  places 0 to 1" (for an add the place past the end, which appends, counts too), or "…; the list is
  empty", with the hint "Use a place the message names; to an empty list, add an item first"; and
  "The block awards stands in the right column, the anchor northwind does not; the anchors of the
  right column: programming-languages, …, interests", with the hint "Use an anchor of the column the
  block stands in, one the message lists". Every fact stays, in the message
  proposal: an issue can carry a hint of its own beside the hint its code declares, from values the
  issue holds, as a tool raises it
  kind: workaround
  golden: no difference

## Passing outside the golden

What holds only between two packages, and the package that ends it.

- `NO_CV` has no command, where the old shell names `oriko schema init`, and its hint still says
  "run the command". Calls: `plan`, `preview`, `build --out cv.docx` and every edit, such as
  `block remove --json '{"id":"awards"}'`, on a data folder without a CV. Package 7 adds the hint
  to `init`.
- `UNKNOWN_BLOCK` inside the input of an edit has no command, where the old shell names
  `oriko show --cv NAME --block`, and its hint still says "run the command". Calls:
  `block remove --json '{"id":"nobody"}'`, and the same at `before` or `after` of `block add` and
  `block move` and at `block` of the item edits. Package 7 adds the hint to `show`.
- `UNKNOWN_BLOCK` and `UNKNOWN_CV` inside a profile carry adx's command `oriko plan … --profile`,
  a list of profiles, while their hints promise block ids and CV names; `preview` and `build`
  name `oriko preview … --profile` and `oriko build … --profile` the same way. Calls:
  `plan --profile broken`, `plan --profile ghost`, `preview --profile broken`. Package 7 adds the
  hints to `show` and `cvs`.
- A `SCHEMA` issue inside a patch of a block in a profile names `oriko schema profile`, where the
  old shell names `oriko schema block`. Calls: `plan --profile NAME` and `preview --profile NAME`
  whose patch of a block fails its schema. The command names `oriko schema block` again once the
  check of a profile runs through adx's `check()` with the real shapes, in the package that moves
  `core/check.ts` onto adx.
- `ORIKO_HOME` moves the data folder of the moved commands only; the old shell does not read it.
  Package 9 ends it.
- An option before a moved command (`--home X plan`, `--home X build --out cv.docx`,
  `--home X photo set --file me.png`, `--home X block remove --json '{"id":"awards"}'`) is refused with `OPTION_BEFORE_COMMAND`, while the old shell
  takes it before a command that is not moved. Package 9 ends it.
- The old `oriko schema photo set` still describes the old form: the picture as the word `file`
  after the command, no `--file` and no `--replace`, as section 4 of the plan keeps the old schema
  byte for byte. Calls: `schema photo set` and `schema`. Package 9 ends it, when `oriko schema` is
  adx's.
- A CV that today's `init` creates holds `cvs/NAME.png`, so its first `photo set` needs
  `--replace`. Call: `photo set --file me.png --cv erika` after `init --cv erika`. Package 7 ends
  it, when `init` names the shared `placeholder.png`.

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
| 41, 42, 65 | `plan`, `plan --profile acme`, `plan --cv=jane` | `next` names `preview` and `build` again, the same two steps as before package 2 | passing: ends the passing difference of package 2, since `preview` and `build` run on adx |
| 45 | `preview --profile acme` | the sheets stand in `result.preview`; the step to `build` is the same | listed: README "One answer shape" |
| 46, 47 | `preview --profile acme --output text`, `preview --credits --output text` | the same sheets, then an empty line and adx's `Next:` block with the step to `build` | adx's own: guide "Run it" (the text form) |
| 48 | `build` | refusal shape; `SCHEMA` at `out` with adx's message and hint, in place of `MISSING_OPTION`; the command `oriko schema build` stays | adx's own: guide "The answer", "How adx reads a call" (a missing field) |
| 49 | `build --out` | refusal shape; adx's `MISSING_VALUE` wording, with the command `oriko schema build` | adx's own: guide "The answer", "How adx reads a call" (a missing value) |
| 50 | `build --out cv.docx --dry-run` | `{ ok, applied: false, result: { file, bytes, replaces, style, pages }, next }`; the step is the call without `--dry-run`, with the `does` of `build` | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`"; adx's own: guide "A command that changes something" |
| 51, 53 | `build --out cv.docx`, `build --out term.docx --style terminal --credits` | the answer shape of call 50 with `applied: true` and the upload step; the files keep their bytes and mode 644 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`", "`build` says `replace: 'always'`" (70); section 5 of the plan for the mode |
| 52 | `build --out cv.docx` again | `unchanged: true`; the record loses the file, which is not touched | listed: decision 81, the same bytes again write nothing (guide "Files") |
| 54 | `build --out cv.txt` | refusal shape; `WRONG_EXTENSION` keeps its path, message and hint | adx's own: guide "The answer" |
| 55 | `build --out ../cv.docx` | refusal shape; `PATH_OUTSIDE` in adx's words, "../cv.docx leads out of the root work" | adx's own: guide "The answer", "Files the call names" |
| 56 | `build --out nodir/cv.docx` | exit 0: the folder is created with mode 700 and the file with 644, in place of `FOLDER_NOT_FOUND` | listed: README "A missing folder of `--out` is created"; adx's own: guide "Files" (the mode of a folder adx creates) |
| 57 | `build --style` | `{ ok, result: { option, values: [{ value }] } }` | adx's own: guide "Options and their values" |
| 58 | `build --out x.docx --style nope --credits` | refusal shape; `NOT_IN_LIST` alone, with the command `oriko build --out x.docx --credits --style`, in place of `UNKNOWN_STYLE` and `CREDITS_NEED_TERMINAL` | listed: README "A value outside a list is `NOT_IN_LIST`"; adx's own: guide "Refusing bad input with a hint" (the layers) |
| 59 | `build --out x.docx --dry-run=yes` | refusal shape; adx's `UNEXPECTED_VALUE` wording, with the command `oriko schema build` | adx's own: guide "The answer", "How adx reads a call" |
| 118, 119, 120 | `photo set --file me.png --cv jane --dry-run`, `photo set --file me.png --cv jane`, `photo set --file me.png --profile acme` | the call names the picture with `--file`, in place of a word after the command | listed: README "`photo set --file me.png`" |
| 118, 119 | `photo set --file me.png --cv jane --dry-run`, `photo set --file me.png --cv jane` | exit 1, refusal shape; `ALREADY_EXISTS` for `cvs/jane.png`, which the seed holds, hint "add --replace to overwrite cvs/jane.png", command the same call with `--replace --dry-run`; call 119 writes nothing, where today it wrote `cvs/jane.png` and `cvs/jane.json` | listed: README "A second `photo set` needs `--replace`" (70); adx's own: guide "The answer", "A command that changes something" |
| 120 | `photo set --file me.png --profile acme` | `{ ok, applied, result: { photo, owner }, next }`: `photo` is `{ file, bytes, replaces }` of `profiles/acme.png`, `owner` the same of `profiles/acme.json` with `changes`; the step to `build` is the same; `profiles/acme.png` has mode 600, `profiles/acme.json` keeps 644 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`, and `changes` on a replace"; section 5 of the plan for the mode of a photo; adx's own: guide "Files" (a new file gets 0600, an updated one keeps its mode) |
| 121 | `photo set` | refusal shape; `SCHEMA` at `file` with adx's message and hint and the command `oriko schema photo set`, in place of `MISSING_INPUT` | listed: README "`photo set` without a file is adx's own refusal for a missing field"; adx's own: guide "The answer", "How adx reads a call" (a missing field) |
| 81, 82, 85 to 97 | the 15 edits on `erika` that write, from `contact add` to `block remove` | `{ ok, applied: true, result, next }`: `command` is gone, `written` is `applied`, `fits` and `layout` stand in `result` beside `file`, `bytes`, `replaces: true` and `changes`; the steps to `preview` and `build` are the same; `cvs/erika.json` keeps its bytes and its mode 644 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`, and `changes` on a replace", "One `after` for the 13 edits" (80); adx's own: guide "Files" (an updated file keeps its mode) |
| 83 | `item add --cv erika --json '{"block":"skills","value":"Rust"}' --dry-run` | the answer of call 86 with `applied: false`; the step is the call without `--dry-run`, `oriko item add --cv erika --block skills --json '{"value":"Rust"}'`, with the `does` of `item add`, in place of "repeat the call without --dry-run to write" | listed: README "One answer shape"; adx's own: guide "A command that changes something" (the dry run and the real run answer the same fields; the step after a dry run), "How adx reads a call" (options and `--json` fill one object) |
| 84 | `item add --cv erika --json '{"block":"skills","value":5}'` | refusal shape; `SCHEMA` keeps its path `value`, its message and its command `oriko schema item`, with adx's hint "Pass the input the schema of the command shows" | adx's own: guide "The answer", "Input that has parts" (a part only the handler can check); listed: decision 78 (`check` with `{ as: Item }`) |

## Decisions of the coordinator

Every decision the coordinator of the move took without the person, by the person's rule: the
work stops only when an approach cannot work at all, and everything else is decided and logged.

- D1, package 2
  question: what is the command of a `SCHEMA` issue inside a stored CV or profile, before the
  tool lists its shapes
  variants: (a) adx's fallback, the schema of the command that ran, until a later package lists
  the shapes; (b) the tool lists the shapes `master` and `profile` from package 2 on
  choice: b
  reason: with (a) the command shows the two options of `plan` and no longer the shape that
  failed, a function oriko has today; (b) keeps it with what adx offers
- D2, package 2
  question: which file an issue of the check or of the page plan lies in, `cv` or `profile`
  variants: (a) by a list of codes; (b) below `profile` when the profile holds a value at the
  path; (c) as (b), but an issue the CV alone raises always lies in the CV
  choice: c
  reason: a list of codes misplaces every issue that only arises with the profile laid over the
  CV; (b) alone misplaces an issue of the CV whose path the profile also holds; with (c) a path
  always leads to a value in the file its first part names
- D3, package 2
  question: does the lowest Node version rise from 24 to 24.2, as adx's guide asks
  variants: (a) raise it in `package.json`, `install.sh`, `docs/compatibility.md` and the README;
  (b) keep 24
  choice: b
  reason: adx's `package.json` asks for `>=24`, and the one use of 24.2 is `import.meta.main` in
  an example of adx, which `bin/oriko.ts` does not use
- D4, before package 3
  question: does oriko's own code that the plan keeps stay, under the rule that no workaround
  weakens a check of adx
  variants: (a) it stays as planned, and nothing is added beyond it: the source of `read`, the
  picture of `photo set`, the files under `assets/`, LibreOffice; (b) it goes, and each loss is
  logged
  choice: a
  reason: the person decided each of them before the rule, and each keeps every check and byte
  limit it has today; with (b) `read` and `photo set` could take no file the person names
- D5, before package 3
  question: how a test gives `build` a LibreOffice that is not the real one
  variants: (a) a variable names the program; (b) the test replaces, in its own process, the
  function that finds the program; (c) only the conversion is tested, and `build` never with a
  PDF
  choice: b
  reason: with (a) a variable would decide which program oriko starts; (c) leaves the way
  through `build` untested; (b) needs no new input of the program (W10)
- D6, before package 3
  question: are golden calls added for a photo stored with `--replace` and for `ALREADY_EXISTS`
  of `profile set`, which no record shows any more after packages 4 and 6
  variants: (a) add them with those packages; (b) keep the call list as it is until the review
  at the end, and cover both cases with a test in the process of the test
  choice: b
  reason: the call list changes only where a listed change alters the form of a call, so every
  other difference of the golden stays a comparison of the same calls
- D7, package 3
  question: the code that starts LibreOffice reads three things of the environment, as it does
  today: on Windows the folders `PROGRAMFILES` and `PROGRAMFILES(X86)` to find the program, the
  temporary folder, and the whole environment it hands to LibreOffice. Does that stay, now that
  the code runs inside a command on adx
  variants: (a) it stays as it is (W10); (b) fixed paths on Windows and an environment cut down
  to a list
  choice: a
  reason: nothing was built for the move, it is the kept own code of D4, and no check of adx is
  weakened, since adx starts no program; (b) would change which installations of LibreOffice
  oriko finds, with no call that asks for it
- D8, before package 4
  question: oriko's own code that reads a file the person names raises `FILE_NOT_FOUND`,
  `NOT_A_FILE` and `INPUT_TOO_LARGE` today. adx owns these names, and a tool cannot declare
  them. What are the codes called now
  variants: (a) one code for every failed read; (b) a code of its own per case, named after the
  thing that was read, with the kind and the hint of today; (c) no check of oriko's own, and
  whatever the read throws goes to adx
  choice: b, for the picture of `photo set`: `NO_PICTURE` (the name of adx's sketch),
  `PICTURE_NOT_A_FILE` and `PICTURE_TOO_LARGE`. A code adx does not own keeps its name
  reason: (a) hides from the caller what to fix; (c) drops the byte limit and the refusal of a
  folder, two checks oriko has today; (b) keeps every check and tells the cases apart as today
- D9, package 4
  question: what does the `example` of `photo set` name. The test kit calls every command with
  its example, and the picture lies in no root, so the kit can put none where the call finds it
  variants: (a) no example; (b) the absolute path of a picture the package ships; (c) the path
  of that picture relative to the root of the repository, `assets/placeholder.png`
  choice: c
  reason: with (a) the test kit fails, since a command with a required field and no example
  cannot be called validly; (b) would put a path of one machine into `schema` and into the
  golden; (c) passes while the test runs in the root of the repository (W23). The test of the
  whole program in the last package runs elsewhere and is decided there
- D10, package 5
  question: an edit that leaves the CV too long for its pages is stored, and its answer lists
  what does not fit under `layout`. In which form do these issues stand there
  variants: (a) as today, with paths into the CV and no command; (b) in the form of a refusal of
  adx, below the field `cv` and with adx's command
  choice: a
  reason: `layout` is data of a successful answer and no refusal, so nothing of adx sets its
  form; (a) keeps what a caller of today reads there
- D11, before package 6
  question: what does `profile set` answer to a call that names no field of a profile. Today a
  call without input is refused, and `--json '{}'` stores an empty profile. On adx every field
  of a profile is optional, and text piped to stdin is ignored without `--json -`, so a call in
  the old form, with the profile piped, would store an empty profile, and with `--replace` over
  the stored one
  variants: (a) the call stores an empty profile, as adx reads it; (b) a call that names no
  field of a profile is refused, with a hint that names `--json -`
  choice: b
  reason: with (a) a caller who pipes a profile the old way loses the stored profile without a
  word; (b) costs one thing, `--json '{}'` no longer stores an empty profile, and a profile that
  changes nothing is still stored with its field `cv` alone
