# adx workarounds

Each place where oriko on adx meets a gap of adx: what oriko builds around it with what adx
offers, the code of its own it keeps, or the behavior it loses, and the golden differences of
each move, with their sources.

- W1 core/issues.ts:222
  gap: a tool cannot raise `SCHEMA` itself; adx owns the code, and only `check()` raises it,
  against a schema (decision 78, guide "Input that has parts")
  call: `oriko plan --profile climb`, whose field `cv` fails its schema
  today: `SCHEMA` at `cv`, hint "Run the command for the accepted shape", command
  `oriko schema profile --home …`
  now: `SCHEMA` at `profile.cv` with adx's hint and the command `oriko schema profile`; the issue
  of oriko's own check (`core/check.ts`, which answers issues of its own, W41) is raised again
  through `check()` with `z.never(message)` and `{ as: Profile }`, or `{ as: Master }` for the CV,
  or `{ as: Block }` below `profile.blocks.<id>`, a patch, and the tool lists the shapes
  proposal: a tool can raise `SCHEMA` at a path with its own message and name the shape it shows
  kind: workaround
  golden: no difference
- W2 core/load.ts:59
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
- W3 core/load.ts:137
  gap: a path cannot point into a stored file on its own; it starts with a field of the call
  (decision 69, proto/oriko README "What does not fit yet")
  call: `oriko plan --home FOLDER` on a data folder without a CV
  today: `NO_CV` at `home`
  now: `NO_CV` raised with `.issue()`, with no path
  proposal: a path can start at a root, for a folder no field of the call names
  kind: loss
  golden: no difference
- W4 core/load.ts:137
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
- W5 core/sources.ts:17
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
  --home …/inlink` did until it moved. A folder
  or a pipe at `cvs/NAME.json` is refused with `NOT_A_FILE` at `cv`. A regular file `cvs`
  (`--home …/flat`) is refused with `PATH_REFUSED` at `home`, ENOTDIR in the message. A link at
  `cvs/NAME.json` that leads out of the data folder counts as a CV
  now: `NO_CV`; with another CV stored, the linked one is left out of the list and `--cv jane`
  is `NOT_IN_LIST`. A folder or a pipe at `cvs/NAME.json` is left out of the list the same way.
  A regular file `cvs` answers `NO_CV`, whose hint sends the caller to create a CV. A link that
  leads out of the data folder is passed over: that one is a check adx adds, not a loss.
  The profiles the same: a folder `profiles/folder.json` and a link `profiles/link.json` to
  `acme.json` inside the data folder are left out of `oriko profiles`, where the old program listed
  the folder with `NOT_A_FILE` and the link with `fits: true`; `oriko profile show --profile link`
  answers `NOT_IN_LIST`, where it answered the profile, and so does a name whose `NAME.posting.md`
  is a folder
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
- W8 core/sources.ts:19
  gap: a tool cannot give a code of adx a hint, and a value outside the list of a field is adx's
  `NOT_IN_LIST` (proto/oriko README "A value outside a list is `NOT_IN_LIST`")
  call: `oriko plan --profile acme` in a data folder with a CV and without a profile
  today: `UNKNOWN_PROFILE` at `profile`, hint "Run the command for the shape of a profile, then
  store one with oriko profile set", command `oriko schema profile set`
  now: `NOT_IN_LIST` at `profile`, whose command `oriko plan --profile` answers an empty list;
  the pointer to `oriko profile set` is gone. `profile set` runs on adx too, but the gap stays:
  the empty list answers no step; `oriko profiles` names `oriko schema profile` in this case
  proposal: a source can name a step for an empty list, which adx then gives the issue as its
  command
  kind: loss
  golden: no difference
- W9 core/issues.ts:126
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
- W18 cli/build.ts:92
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced and adx never writes through a link (guide "Files
  the call names"; adx `src/files/paths.ts`, `linkedFile`)
  call: `oriko build --style terminal --out link.docx`, where `link.docx` is a link to `real.docx`
  of the working directory, 8 bytes with mode 600
  today: the rename replaces the link with the built file; `real.docx` stays as it was
  now: `TARGET_NOT_A_FILE` at `out`, kind fix, "link.docx is a link to another file, which the
  write would change"; `link.docx` stays the link and `real.docx` keeps its 8 bytes and mode 600.
  `targetIssue` of `core/home.ts` refuses a target that `exists` and that `work.list()` of its
  folder does not hold, before anything is staged. A link that leads nowhere or out of the working
  directory passes, and adx replaces it with the file. The old behavior, the link replaced by the
  built file, stays lost: oriko could keep it only by reading the working directory itself
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: workaround
  golden: no difference
  same gap as: W17
- W19 classic/images.ts:59
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
- W21 classic/images.ts:79
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
- W24 classic/images.ts:59
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
- W25 classic/photo.ts:49
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced (guide "Files the call names"; adx
  `src/files/paths.ts`, `linkedFile`)
  call: `oriko photo set --file me.png --replace`, where `cvs/jane.png` is a link to
  `store/jane.png` of the data folder
  today: the rename replaces the link with the photo; `store/jane.png` stays as it was
  now: `TARGET_NOT_A_FILE` at `cv`, kind fix, "cvs/jane.png is a link to another file, which the
  write would change"; `cvs/jane.png` stays the link and `store/jane.png` as it was. The same for a
  link to a stored file that is no photo, such as `profiles/acme.png` to `../cvs/jane.json`, at
  `profile`, and `cvs/jane.json` stays as it was. `targetIssue` of `core/home.ts` refuses the photo
  when it `exists` and `home.list()` of its folder does not hold it, before anything is staged; the
  file that names the photo comes from that list already. A link that leads nowhere or out of the
  data folder passes and is replaced, with `--replace`, and its target stays as it was. The old
  behavior, the link replaced by the photo, stays lost
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: workaround
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
- W30 profile/set.ts:36
  gap: a handler cannot tell an empty input from none, since options and `--json` fill one object,
  and text piped to stdin that no `--json -` reads is ignored without a word (guide "How adx reads
  a call", "Options")
  call: `oriko profile set --profile globex --json '{}'`, and `oriko profile set --profile globex`
  with `{"cv":"jane"}` piped to stdin
  today: `--json '{}'` stores an empty profile, exit 0; the piped call stores `{"cv":"jane"}`
  now: both are refused with `NOTHING_TO_STORE`, kind fix, by the `check` of the command, since
  every field of a profile is optional and the piped call would else store an empty profile, with
  `--replace` over the stored one (D11). An empty profile can no longer be stored
  proposal: a handler can ask whether the call gave any input at all, and a call with text on
  stdin that no option reads is refused, or names the text in its answer
  kind: loss
  golden: no difference
- W31 profile/issues.ts:13
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet"), and a path
  starts with a field of the input, while `--json` is an option of adx (decision 69)
  call: `oriko profile set --profile globex`
  today: `MISSING_INPUT` at `json`, kind fix, hint "Run the command for the input shape, then pass it
  with --json or through stdin", command `oriko schema profile set`
  now: `NOTHING_TO_STORE` with no path, kind fix, message "The call names no field of the profile,
  only its name", hint "Run the command for the input shape, then pass it with --json, or through
  stdin with --json -", command `oriko schema profile set`
  proposal: a tool can raise an issue at an option adx gives every command, such as the one that
  takes the whole input
  kind: loss
  golden: no difference
  same gap as: W2
- W32 profile/set.ts:50
  gap: a handler gets the input as its schema answers it, with the keys in the order of the schema,
  not of the call (guide "FAQ", `plan` gets `z.output` of the schema)
  call: `oriko profile set --profile globex --json '{"order":["awards"],"cv":"jane"}'`
  today: the profile is stored as the call gave it: `order`, then `cv`
  now: `cv`, then `order`, in the order of the shape `Profile`: `cv`, `person`, `order`, `blocks`,
  and `role` before `photo` in `person`; a patch inside `blocks` keeps the order of the call. The
  same input in the order of the shape gives the same bytes as today. A profile whose content is
  that of the stored one, so that `changes` finds nothing, keeps the stored text: a profile the old
  program stored in another key order is the same profile again, `unchanged: true`, and nothing is
  written (decision 81)
  proposal: a handler can read the input object as the call gave it, beside its parsed value
  kind: loss
  golden: no difference
- W33 profile/list.ts:52
  gap: a stored file read through a root answers adx's refusals, which end the call (guide "Reading
  a file")
  call: `oriko profiles` with `profiles/badjson.json` holding `{`, and with `profiles/sealed.json` of
  mode 000
  today: the list goes on and shows the profile with `fits: false` and `issues: ["INVALID_JSON"]`,
  or `["INPUT_TOO_LARGE"]` for a file past 1,000,000 bytes; the sealed one with `["PATH_REFUSED"]`
  now: the list goes on and shows `issues: ["STORED_INVALID"]` for the first two, and
  `["SYSTEM_REFUSED"]` for the sealed one: the list takes a refusal of adx (its `Refused`) of the
  reads of one profile as that profile's codes, with `$try`; any other error is a bug and ends the
  call. `oriko profile show --profile badjson` answers `STORED_INVALID`, kind ask, no path, as W2
  says
  proposal: a read of a stored file can answer its refusal as a value, so a list can name a broken
  file and go on
  kind: workaround
  golden: no difference
  same gap as: W2
- W34 profile/set.ts:46
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced (guide "Files the call names"; adx
  `src/files/paths.ts`, `linkedFile`)
  call: `oriko profile set --profile evil --json '{"cv":"jane"}' --replace`, where
  `profiles/evil.json` is a link to `../cvs/jane.json`
  today: the link is replaced by the profile, and `cvs/jane.json` stays as it was
  now: `TARGET_NOT_A_FILE` at `profile`, kind fix, "profiles/evil.json is a link to another file,
  which the write would change"; the link and `cvs/jane.json` stay as they were. The link is not in
  the list of profiles, and `fresh` refuses nothing, so `targetIssue` of `core/home.ts` refuses the
  target before anything is staged. A link that leads nowhere or out of the data folder passes and
  is replaced, with `--replace`. The old behavior, the link replaced by the profile, stays lost
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: workaround
  golden: no difference
  same gap as: W17
- W35 core/issues.ts:81
  gap: adx reads the input itself, `--json -` up to 1,048,576 characters (adx `STDIN_LIMIT`), and
  hands a handler its value only, so a tool cannot set the limit of its input (guide "What every
  tool gets", the limits a call meets); and a tool cannot raise a code adx owns
  call: `oriko profile set --profile globex --json -` with a profile of 1,020,013 bytes on stdin, and
  `oriko item add --json -` the same
  today: `INPUT_TOO_LARGE` at `json`, kind fix, for an input past 1,000,000 bytes as the call gave it
  now: `JSON_TOO_LARGE` with no path, kind fix, hint "Send at most 1000000 bytes; a CV is a few
  thousand", from the `check` of `profile set` and of the 13 edits, which call `oversized` of
  `core/issues.ts`. The limit counts the value as compact JSON, so an input whose text is larger
  only by its spaces passes, where it was refused. `init` the same: `oriko init --cv padded
  --dry-run --json -` with the input of a new CV and 1,020,000 spaces before its last `}` on stdin,
  1,020,079 bytes, was `INPUT_TOO_LARGE` at `json` (the old `cli/input.ts`) and passes now;
  with a `role` of 1,020,000 characters it is `SCHEMA` at `role`, "Too big: expected string to have
  <=300 characters". `init` calls no `oversized`: `NewCv` is a strict object, so it refuses every
  key it does not name, `cv` is an id of at most 60 characters, `language` two letters and the
  three other fields texts of at most 300 characters, so no input that passes the schema can pass
  the limit
  proposal: a tool sets the limit of its input, counted in bytes of the text the call gave
  kind: workaround
  golden: no difference
- W36 core/sources.ts:55
  gap: a source answers choices or `needs()`, and nothing else; it cannot refuse the call for what
  keeps it from listing (guide "Options and their values"; adx `src/values/ask.ts`). That adx answers
  a `Refused` a source throws as the refusal of the call is no promise of the guide: it holds because
  `refusedOf` of adx `src/core/failed.ts` keeps a `Refused` with its issues as it comes, wherever it
  was thrown
  call: `oriko show --block` and `oriko show --block awards` on a data folder without a CV
  today: `NO_CV` at `home`, from the list of `--block` and from `show` alike; with several CVs and
  no `--cv` `CV_REQUIRED`, and a CV that fails its shape `SCHEMA`
  now: the same codes: the source of `--block` throws adx's `Refused` with the issues that keep the
  CV from being shown (`NO_CV`, `CV_REQUIRED`, `CV_MISMATCH`, `UNKNOWN_CV`, `SCHEMA` below `cv`), and
  adx answers it as the refusal of the call, with the commands of the hints, such as `oriko init`
  for `NO_CV`. An empty list would refuse `--block awards` with `NOT_IN_LIST` and answer
  `oriko show --block` with no value
  proposal: a source can answer the issues that keep it from listing, which adx answers as the
  refusal of the layer of the lists
  kind: workaround
  golden: no difference
- W37 cv/list.ts:59
  gap: a stored file read through a root answers adx's refusals, which end the call (guide "Reading
  a file")
  call: `oriko cvs` with `cvs/badjson.json` holding `{`, and with `cvs/sealed.json` of mode 000
  today: the list goes on and shows the CV with `fits: false` and `issues: ["INVALID_JSON"]`, the
  sealed one with `["PATH_REFUSED"]`
  now: the list goes on and shows `issues: ["STORED_INVALID"]` and `["SYSTEM_REFUSED"]`: the list
  takes a refusal of adx of the read of one CV as that CV's codes, with `$try`; any other error is a
  bug and ends the call. A folder, a pipe or a link at `cvs/NAME.json` is left out of the list (W6)
  proposal: a read of a stored file can answer its refusal as a value, so a list can name a broken
  file and go on
  kind: workaround
  golden: no difference
  same gap as: W2
- W38 cv/init.ts:45
  gap: a write follows a link at its target to a file inside the root and writes through it, or
  writes nothing when that file holds the same bytes; and a write with `replace: false` refuses any
  other thing at its target with `ALREADY_EXISTS` or `NOT_A_FILE` at no field (guide "Files the call
  names"; adx `src/files/paths.ts`, `linkedFile`)
  call: `oriko init --cv linked --json '{"language":"de","firstName":"Erika","lastName":"Muster","role":"Entwicklerin"}'`,
  where `cvs/linked.json` is a link to `cvs/jane.json`; the same for a link that leads nowhere, a
  link out of the data folder and a folder at `cvs/NAME.json`, each also with `--dry-run`
  today: `CV_EXISTS` at `cv` for all four, since the old list of CVs saw every name in `cvs/`
  now: `TARGET_NOT_A_FILE` at `cv`, kind fix, "cvs/linked.json is a link to another file, which the
  write would change", from `targetIssue` of `core/home.ts`. Without it a link to a file with the
  bytes of the new CV answers `unchanged: true`, and no CV of that name exists (measured). A link
  that leads nowhere and a link out of the data folder are adx's `ALREADY_EXISTS` at no field,
  "cvs/nowhere.json exists and holds other bytes", hint "pick another name"; a folder adx's
  `NOT_A_FILE` at no field. init takes no `--replace`, so no form of the call replaces any of them,
  and the target of a link stays as it was. The placeholder needs no such check (W39)
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed; a write refused for what stands at its target stands at the field
  that names the target
  kind: workaround
  golden: no difference
  same gap as: W17
- W39 cv/init.ts:48
  gap: a root is a folder of the person; the files a package ships lie in none (proto/oriko README
  "Two files of the package lie in no root")
  call: `oriko init --cv erika --json '{"language":"de","firstName":"Erika","lastName":"Muster","role":"Entwicklerin"}'`
  today: oriko's own code reads `assets/placeholder.png` with node:fs and writes it as
  `cvs/erika.png` beside the CV, for every CV
  now: oriko's own code reads `assets/placeholder.png` with node:fs, and `files.write` stages it as
  `placeholder.png` of the data folder only when `exists` says nothing stands there; every new CV
  names it (decision 70). Whatever stands at `placeholder.png` is kept, with no check that it is a
  picture: a link to `cvs/jane.json` there is kept and named by the new CV, nothing is written
  through it, and `oriko build --cv erika --out x.docx` answers `PHOTO_UNREADABLE` at
  `cv.person.photo` later (measured). A link that leads nowhere is `ALREADY_EXISTS`, a link out of
  the data folder `PATH_OUTSIDE`, a folder `NOT_A_FILE`, each at no field, and init writes neither
  file
  proposal: a tool can declare a read-only root for the files it ships
  kind: kept own code
  golden: no difference
  same gap as: W11
- W40 cv/show.ts:43
  gap: one source answers both the list of an option given without a value and the check of a
  value the call gives (guide "Options and their values")
  call: `oriko show --profile acme --cv` with the CVs `erika` and `jane` stored
  today: the values `["jane"]`, only the CV the profile names
  now: every stored CV, `erika` and `jane`; `--cv erika --profile acme` is `NOT_IN_LIST` at
  `profile` (W42)
  proposal: a source can answer the list of an option apart from the check of a value
  kind: loss
  golden: no difference
  same gap as: W5
- W41 core/issues.ts:160
  gap: a public `Issue` of adx shows its `code`, its `path` and `command()` only; its message and
  hint stay inside adx (adx `dist/core/issue.d.ts`), and an issue takes its path when it is made
  call: `oriko cv update --cv jane --json '{"pages":1}'`, whose answer lists under `layout` what no
  longer fits; and `oriko plan --profile acme` on a CV whose role the profile makes too long
  today: the check and the page plan answer issues with code, path, message and hint as data
  now: the same: `core/check.ts` and `core/place.ts` answer issues of their own, which
  `issues.old.ts` makes, and `raised`, `turnedEach` and `issueAt` of `core/issues.ts` turn each
  into an issue of adx once its field is known. Issues of adx could not fill `layout` of a
  successful answer, which holds code, path, message and hint as data (decision D10), and `fileOf`
  of `core/place.ts` needs the code and the path of each issue in the CV alone before it decides
  whether the issue stands below `cv` or `profile`
  proposal: an issue of a tool can be read back as data, its code, path, message and hint, and be
  placed below a field after it is made
  kind: workaround
  golden: no difference
- W42 core/sources.ts:30
  gap: a step of a hint carries each value checked alone against its source, beside the other
  fields of the refused call, not the carried values together as one call of the target (adx
  `src/values/accepts.ts`, decision 79)
  call: `oriko profile set --profile acme --json '{"cv":"erika","blocks":{"nobody":{}}}'`, with or
  without `--replace`, and `oriko profile set --profile acme --cv erika --order nobody --replace
  --dry-run`, where the CVs erika and jane are stored and `profiles/acme.json` holds
  `{"cv":"jane"}`
  today: before the migration `UNKNOWN_BLOCK` named `oriko show --cv erika --block`, the CV of the
  input; on adx with `show.step().carry('cv', 'profile')` alone it named `oriko show --cv erika
  --profile acme --block`, which answers `CV_MISMATCH`
  now: `oriko show --cv erika --block`, which lists the blocks of erika: the source of `--profile`
  in `show` lists, beside a `--cv`, only the profiles of that CV and those that name none, so the
  step leaves acme out. The cost: `oriko show --cv erika --profile acme` is `NOT_IN_LIST` at
  `profile`, with the command `oriko show --cv erika --profile`, where it was `CV_MISMATCH` at
  `cv`, and `oriko show --cv erika --profile` lists erika's profiles and those that name no CV,
  where it listed all
  proposal: the values a step carries are checked together as one call of the target, so a pair of
  values the target refuses stays out of the step
  kind: workaround
  golden: no difference
- W43 cv/init.ts:50
  gap: adx answers a system error of a write as `SYSTEM_REFUSED`, kind ask, at no field, whatever
  the error (guide "Files the call names", "A full disk")
  call: `oriko init --cv erika --json '{"language":"de","firstName":"Erika","lastName":"Muster","role":"Entwicklerin"}'`,
  where `cvs` of the data folder is a folder of mode 555
  today: `PATH_REFUSED` at `home`, kind fix (measured by the reviewer on 8a15349)
  now: `SYSTEM_REFUSED`, kind ask, no path, "open of …/cvs/.<uuid>.adx-tmp failed with EACCES",
  state "Nothing was changed. The temporary files were removed."; `placeholder.png` is not written
  either. The same call with `--dry-run` answers the plan, exit 0, since a dry run stages no file
  proposal: a system error on a path the input names stands at that field, and its kind follows who
  can solve it: a missing right for the caller, a full disk for the person
  kind: loss
  golden: no difference
  same gap as: W15
- W44 cv/show.ts:51
  gap: adx answers a system error of a read as `SYSTEM_REFUSED`, kind ask, at no field, whatever the
  error (guide "Reading a file", "Errors you did not map")
  call: `oriko show --cv sealed`, where `cvs/sealed.json` has mode 000
  today: `PATH_REFUSED` at `cv`, kind fix (measured by the reviewer on 8a15349)
  now: `SYSTEM_REFUSED`, kind ask, no path, "open of …/cvs/sealed.json failed with EACCES"; the same
  for `oriko show --cv sealed --block`, from the source of `--block`
  proposal: a system error on a path the input names stands at that field, and its kind follows who
  can solve it: a missing right for the caller, a full disk for the person
  kind: loss
  golden: no difference
  same gap as: W15
- W45 read/sources.ts:67
  gap: adx reads a file only inside a root and talks only to a server the tool declares (guide
  "Reading a file", "Wrapping a remote API"; proto/oriko README "`read` reads what adx cannot", adx
  TODO #6)
  call: `oriko read --posting ~/Downloads/job.pdf --profile acme`, and `oriko read --posting
  https://jobs.example/1 --profile acme`
  today: oriko's own code reads the file anywhere on the disk, up to 10,000,000 bytes, a regular
  file only, and downloads the address over https on port 443 to a public address, with at most 5
  redirects, 20 seconds and the listed encodings; a relative path starts at the working directory
  of the call
  now: the same, by the same code: `readBounded` of `core/files.ts` with `FILE_LIMITS.readBytes`,
  and `download` of `read/web.ts` through `NODE_WEB`, with every check of today; a relative path
  starts at the working directory of the process (W24)
  proposal: an allow-list of the folders the person opens, and a remote for an address the person
  names, which keeps the checks of the address at every redirect
  kind: kept own code
  golden: no difference
  same gap as: W19
- W46 read/sources.ts:73
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet")
  call: `oriko read --resume missing.pdf`, `oriko read --resume <folder>`, `oriko read --resume
  huge.txt` with 10,000,001 bytes, `oriko read --posting http://example.com/job --profile globex`,
  `oriko read` alone, and a download whose name does not resolve or whose server answers 503
  today: `FILE_NOT_FOUND`, `NOT_A_FILE`, `INPUT_TOO_LARGE` and `URL_NOT_ALLOWED` at the option of
  the source, `MISSING_INPUT` at `posting`, kind fix; `NETWORK_FAILED` and `SERVER_BUSY`, kind retry
  now: `SOURCE_NOT_FOUND`, `SOURCE_NOT_A_FILE`, `SOURCE_TOO_LARGE`, `ADDRESS_NOT_ALLOWED`,
  `NOTHING_TO_READ`, `DOWNLOAD_FAILED` and `SITE_BUSY`, with the same paths, messages and kinds (D21);
  `read/web.ts` and `read/text.ts` keep their issues of today, and `turned` of `read/sources.ts`
  turns each by its code into the code of `read/issues.ts`. `MISSING_OPTION` for `--posting`
  without `--profile`, `PATH_REFUSED`, `PRIVATE_ADDRESS` and the other codes adx does not own keep
  their names (measured: adx starts with `MISSING_OPTION` and `PATH_REFUSED` declared, and refuses
  the seven others with `DECLARATION`); `PATH_REFUSED`, which `photo set` raises too, moves to
  `core/issues.ts`
  proposal: a tool can raise one of adx's codes for a file the tool's own code read, at the field
  that named the file
  kind: loss
  golden: calls 111, 116 and 117 change their code
  same gap as: W2
- W47 read/issues.ts:90
  gap: a code has one fixed hint, declared once with `code()` (guide "Refusing bad input with a
  hint"; proto/oriko README "A code has one hint")
  call: `oriko read --posting https://nowhere.example/ --profile acme`, a download that stops
  midway, `oriko read --resume broken.pdf`, and `oriko read --resume bomb.docx` that unpacks to more
  than 5,000,000 bytes
  today: `NETWORK_FAILED` has three hints, one for a name that does not resolve, one for a failed
  request and one for a body that stops; `DOCUMENT_UNREADABLE` names the kind of the document in
  its hint, or says "Save the page and pass the file" for a body it cannot unpack;
  `INPUT_TOO_LARGE` names the limit, 10,000,000 or 5,000,000 bytes, in its hint
  now: `DOWNLOAD_FAILED` has one hint that joins the three, `DOCUMENT_UNREADABLE` one for both
  cases, and `SOURCE_TOO_LARGE` a hint without a number; each message still names what differs,
  such as "The name … could not be resolved" or "The input is larger than 5000000 bytes"
  proposal: an issue can carry a hint of its own beside the hint its code declares, from values the
  issue holds, as a tool raises it
  kind: workaround
  golden: no difference
  same gap as: W29
- W48 read/documents.ts:81
  gap: adx cannot promise that a dry run sends nothing when the tool's own code sends, and the test
  kit can stand in only for a declared remote (proto/oriko README "`read` reads what adx cannot",
  guide "Testing your tool")
  call: `oriko read --posting https://jobs.example/1 --profile globex --dry-run`
  today: the dry run downloads the page, as the real run does, and writes nothing
  now: the same; a test replaces the two calls of `NODE_WEB` in `read/web.ts` with `mock.method` of
  `node:test` and counts the requests, and `conformance` with the program could not stand in for
  the network
  proposal: a remote for an address the person names, whose requests the test kit fakes and counts
  on a dry run, as it does for a declared server
  kind: kept own code
  golden: no difference
- W49 read/documents.ts:64
  gap: the test kit can give a probe no file outside every root, and its probe of `--replace`
  fails an effect whose example stages no `files.write` (guide "Testing your tool", "`--replace`")
  call: `conformance(t, oriko, { seed })`, which probes `oriko read`
  today: no conformance; the old shell has no example
  now: the example names the posting of the package
  `examples/showcase/go-e-senior-backend/posting.md`, relative to the repository's root, for the
  profile `acme` of the seed, so a probe stores a posting in its scratch folder. An example with
  `--resume`, which stores nothing, fails the probe "--replace" (measured: "its plan stages no
  files.write, so --replace guards nothing"). It passes only while the process of the test runs in
  the repository's root
  proposal: the samples of the test kit can name files a probe finds at a plain path, and the probe
  of `--replace` takes an effect that stages a write for some input of its own
  kind: workaround
  golden: no difference
  same gap as: W23
- W50 read/documents.ts:93
  gap: a write follows a link at its target to a file inside the root and writes through it, while
  the guide says a link at the target is replaced (guide "Files the call names"; adx
  `src/files/paths.ts`, `linkedFile`)
  call: `oriko read --posting job.txt --profile linked`, where `profiles/linked.posting.md` is a link
  to `../cvs/jane.json`, and `oriko read --notes a.md --cv jane`, where `cvs/jane.notes.md` is a link
  to `jane.json`; the same with `--replace`, with a link that leads nowhere, a link out of the data
  folder and a folder at the target
  today: a posting at a link to a stored file or out of the data folder is `POSTING_EXISTS`, and
  with `--replace` the link is replaced by the posting; a link that leads nowhere is replaced
  without `--replace`. Notes at any link are written as a new file that holds the text of the
  link's target and the new notes, the target stays as it was. A folder is `NOT_A_FILE` at `home`
  (measured on 705000f)
  now: a link to a stored file is `TARGET_NOT_A_FILE` at `profile` or `cv`, kind fix, with and
  without `--replace`, from `targetIssue` of `core/home.ts`, before anything is staged, so the
  posting of the same call is not written either. A link that leads nowhere is adx's
  `ALREADY_EXISTS` at no field for a posting and for first notes, and `--replace` replaces it; a
  posting at a link out of the data folder the same, and its target stays as it was; notes at a
  link out of the data folder are adx's `PATH_OUTSIDE` at no field, a check adx adds; a folder is
  adx's `NOT_A_FILE` at no field (measured)
  proposal: a link at the target of a write is replaced, as the guide says, or the answer names the
  real file the write changed
  kind: workaround
  golden: no difference
  same gap as: W17
- W51 core/sources.ts:17
  gap: one source answers both the list of an option given without a value and the check of a
  value the call gives (guide "Options and their values")
  call: `oriko read --profile acme --cv` with the CVs `erika` and `jane` stored
  today: the values `["jane"]`, only the CV the profile names
  now: every stored CV, `erika` and `jane`; `--cv erika --profile acme --notes a.md` is
  `CV_MISMATCH` at `cv`, as today
  proposal: a source can answer the list of an option apart from the check of a value
  kind: loss
  golden: no difference
  same gap as: W5
- W52 read/documents.ts:146
  gap: `--replace` is refused with `UNKNOWN_OPTION` on a call whose plan stages no `files.write`,
  and `files.update` takes none (guide "A command that changes something")
  call: `oriko read --resume old.docx --replace`, and `oriko read --notes a.md --cv jane --replace`
  where `cvs/jane.notes.md` holds notes
  today: both run; `--replace` changes nothing for them
  now: `UNKNOWN_OPTION` at `replace`, "--replace is no option of a call whose plan writes no file"
  proposal: a command that stages a write for some input takes `--replace` on every call, and the
  answer says that nothing was replaced
  kind: loss
  golden: no difference
- W53 read/documents.ts:146
  gap: a stored file read through a root answers adx's refusals, which stand at no field (guide
  "Reading a file")
  call: `oriko read --notes a.md --cv jane`, where `cvs/jane.notes.md` holds 10,000,001 bytes, and
  the same where it holds bytes that are no UTF-8 text, such as `old \xff\xfe notes`
  today: `INPUT_TOO_LARGE` at `home`, kind fix, "The input is larger than 10000000 bytes"; the notes
  that are no UTF-8 text are appended to, the old bytes rewritten with replacement characters
  (U+FFFD), `written: true` (measured on 705000f)
  now: `STORED_INVALID`, kind ask, no path, "cvs/jane.notes.md holds more than 10000000 bytes", or
  "cvs/jane.notes.md holds bytes that are no UTF-8 text", from `files.update`, and the file stays as
  it was (measured); notes that would grow past the limit with the new sections are
  `SOURCE_TOO_LARGE` at `notes`, kind fix, as today with its new name. The byte limit
  `FILE_LIMITS.readBytes` stays
  proposal: the issue of a stored file stands at the field of the call that names the file
  kind: loss
  golden: no difference
  same gap as: W2
- W54 read/sources.ts:96
  gap: a tool cannot raise a code adx owns (proto/oriko README "What does not fit yet")
  call: `oriko read --resume old.docx`, where the read of `old.docx` fails with a system error
  outside the list of `core/files.ts` that the caller fixes, such as EIO
  today: `SYSTEM_REFUSED` at `resume`, kind ask, "old.docx: The system refused …/old.docx: EIO"
  now: `turned` of `read/sources.ts` throws the system error on with `failed`: `SYSTEM_REFUSED`, kind
  ask, no path, "open of …/old.docx failed with EIO", adx's hint, and the message no longer names
  the option. Read in adx `src/core/unmapped.ts` and in `read/sources.ts`, not measured: no test can
  make a read fail with EIO
  proposal: a tool can raise one of adx's codes for a file the tool's own code read, at the field
  that named the file
  kind: loss
  golden: no difference
  same gap as: W2

## Passing outside the golden

What holds only between two packages, and the package that ends it.

- `ORIKO_HOME` moves the data folder of the moved commands only; the old shell does not read it.
  Package 9 ends it.
- An option before a moved command (`--home X plan`, `--home X build --out cv.docx`,
  `--home X photo set --file me.png`, `--home X block remove --json '{"id":"awards"}'`) is refused with `OPTION_BEFORE_COMMAND`, while the old shell
  takes it before a command that is not moved. Package 9 ends it.
- The old `oriko schema photo set` still describes the old form: the picture as the word `file`
  after the command, no `--file` and no `--replace`, as section 4 of the plan keeps the old schema
  byte for byte. Calls: `schema photo set` and `schema`. Package 9 ends it, when `oriko schema` is
  adx's.
- The old `oriko schema profile set` still describes the old form: the options `profile`, `json`,
  `replace` and `dry-run` and the input `Profile`, with no `--cv`, `--order` or other field as an
  option, as section 4 of the plan keeps the old schema byte for byte. Calls: `schema profile set`
  and `schema`. Package 9 ends it, when `oriko schema` is adx's.
- The old `oriko schema init` still describes the old form: the options `cv`, `json` and
  `dry-run`, and `json` says the input comes from stdin without it, while `init` on adx reads stdin
  only with `--json -` and takes the fields `--language`, `--first-name`, `--last-name` and
  `--role` as options, as section 4 of the plan keeps the old schema byte for byte. Calls:
  `schema init` and `schema`. Package 9 ends it, when `oriko schema` is adx's.

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
| 35 | `profiles` | `{ ok, result: { items, total }, next }`: the profiles stand in `result.items` with the same fields; the step to `plan` is the same | listed: README "One answer shape" (`cvs` and `profiles` answer `{ items, total }`) |
| 98 | `profile set --profile globex --json` | refusal shape; adx's `MISSING_VALUE` wording, with the command `oriko schema profile set` | adx's own: guide "The answer", "How adx reads a call" (a missing value) |
| 99, 103 | `profile set --profile globex --json '{"cv":"jane","blocks":{"freelance":{"hidden":true}}}'`, `profile set --profile initech --json -` | `{ ok, applied, result: { name, file, bytes, replaces, changes, cv, fits, layout }, next }`: `stored` is `file`, `written` is `applied`, `added`, `changed` and `removed` stand in `changes` beside `more: 0`; the steps to `preview` and `build` are the same; the file keeps its bytes and has mode 600 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`, and `changes` on a replace" (`profile set` returns its own `changes`); section 5 of the plan and adx's own: guide "Files" (a new file gets 0600) |
| 100 | `profile set --profile globex --json '{"cv":"jane","blocks":{"freelance":{"hidden":true}}}'` again | exit 0 in place of `PROFILE_EXISTS`: the answer of call 99 with `unchanged: true` and empty `changes`, and the same two steps; nothing is written | listed: decision 81, README "The same profile again writes nothing" |
| 101 | `profile set --profile globex --replace --json '{"cv":"jane","order":["awards"]}' --dry-run` | the answer shape of call 99 with `applied: false` and `replaces: true`; the step is the call without `--dry-run`, `oriko profile set --profile globex --cv jane --order awards --replace`, with the `does` of `profile set`, in place of "repeat the call without --dry-run to write" | listed: README "One answer shape"; adx's own: guide "A command that changes something" (the step after a dry run), "How adx reads a call" (options and `--json` fill one object) |
| 102 | `profile set --profile globex --json '{"cv":"jane","blocks":{"nobody":{"hidden":true}}}'` | refusal shape; `UNKNOWN_BLOCK` keeps its path `blocks.nobody`, its message and its hint, and has no command, where the old shell names `oriko show --cv jane --block` | adx's own: guide "The answer"; listed: decision 69 (the path starts with a field of the input); passing: the hint of `UNKNOWN_BLOCK` names `show`, package 7 (log, "Passing outside the golden") |
| 103 | `profile set --profile initech --json -` | the call names `--json -` for the profile piped to stdin | listed: README "Input through stdin is `--json -`" |
| 104 | `profile show --profile globex` | `name`, `profile` and `posting` stand in `result`; the step to `plan` is the same | listed: README "One answer shape" |
| 105 | `profile show --profile nope` | refusal shape; `NOT_IN_LIST` at `profile` with the command `oriko profile show --profile`, in place of `UNKNOWN_PROFILE` with `oriko plan --profile` | listed: README "A value outside a list is `NOT_IN_LIST`" (`--profile` has a source); adx's own: guide "The answer", "Commands adx names" |
| 34, 78, 131 | `cvs` | `{ ok, result: { items, total }, next }`: the CVs stand in `result.items` with the same fields; the steps to `show` and `profiles` are the same | listed: README "One answer shape" (`cvs` and `profiles` answer `{ items, total }`) |
| 70 | `cvs --output text` | adx's text form of a list: `items` and `total`, then an empty line and the `Next:` block with the steps to `show` and `profiles` | adx's own: guide "Run it" (the text form); listed: README "One answer shape" |
| 36 | `show` | the outline stands in `result` beside `cv` and `pages`; the step to `show` that needs `block` is the same | listed: README "One answer shape" |
| 37 | `show --block` | `{ ok, result: { option, values: [{ value, does }] } }`: each block id with its kind, section and title in `does`, in place of the whole outline and the name of the CV, which `show` answers (call 36) | adx's own: guide "Options and their values" |
| 38 | `show --block awards` | the block stands in `result` | listed: README "One answer shape" |
| 39 | `show --block nope` | refusal shape; `NOT_IN_LIST` at `block` with the command `oriko show --block`, in place of `UNKNOWN_BLOCK` with `oriko show --cv jane --block` | listed: README "A value outside a list is `NOT_IN_LIST`" (the `--block` of `show` has a source); adx's own: guide "The answer", "Commands adx names" |
| 40 | `show --cv` | `{ ok, result: { option, values: [{ value }] } }` | adx's own: guide "Options and their values" |
| 68 | `show --block -x` | refusal shape; adx's `UNKNOWN_OPTION` at `x`, "show has no option -x", with the command `oriko schema show` | adx's own: guide "The answer", "How adx reads a call" (an unknown option) |
| 69 | `cvs extra` | refusal shape; adx's `UNEXPECTED_ARGUMENT` wording; the command `oriko schema cvs` stays | adx's own: guide "The answer", "How adx reads a call" (a word after the options) |
| 72 | `init --cv erika --dry-run --json -` | the call names `--json -` for the input piped to stdin; `{ ok, applied: false, result: { cv, photo, placeholder }, next }`: `cv` and `placeholder` are `{ file, bytes, replaces }` of `cvs/erika.json` and `placeholder.png`, `photo` is `placeholder.png`; the step is the call without `--dry-run`, its input as options, with the `does` of `init`, in place of "repeat the call without --dry-run to write" that needs `json` | listed: README "Input through stdin is `--json -`", "One answer shape", "A write answers `{ file, bytes, replaces }`", "`init` writes one shared placeholder photo" (70); adx's own: guide "A command that changes something" (the step after a dry run), "How adx reads a call" (options and `--json` fill one object) |
| 73, 130 | `init --cv erika --json …` | the answer of call 72 with `applied: true`; the steps to `contact add`, `block add` and `photo set` are the same, and need `value`, `block` and `file`; `cvs/erika.json` names `placeholder.png` and has mode 600, and `placeholder.png` of the data folder, mode 600, is written in place of `cvs/erika.png` with mode 644; call 130 creates the data folder and `cvs` with mode 700 | listed: README "`init` writes one shared placeholder photo" (70), "One answer shape", "A write answers `{ file, bytes, replaces }`"; section 5 of the plan for the mode; adx's own: guide "Files" (a new file gets 0600, a folder adx creates 0700), "The data folder" (the first real write creates a missing default folder), "Next steps" (`needs` names input fields) |
| 74 | `init --cv erika --json …` again | refusal shape; `CV_EXISTS` keeps its path, message and hint, and gets the command `oriko init --language de --first-name Erika --last-name Muster --role Entwicklerin --cv`, which lists the names taken | adx's own: guide "The answer", "Refusing bad input with a hint" (adx fills `command` at a field that has a source) |
| 75 | `init --cv` | exit 0 with `{ ok, result: { option, taken } }`, the names already taken, in place of `MISSING_VALUE` with the command `oriko show --cv` | adx's own: guide "A command that changes something" (`fresh` answers the names taken), "Options and their values" |
| 76 | `init --cv x --json '{'` | refusal shape; adx's `INVALID_JSON` at `json`, its wording and hint, with the command `oriko schema init` | adx's own: guide "The answer", "How adx reads a call" |
| 77 | `init --cv x` | refusal shape; `SCHEMA` at `language`, `firstName`, `lastName` and `role` with adx's hint and the command `oriko schema init`, in place of `MISSING_INPUT` at `json` | adx's own: guide "The answer", "How adx reads a call" (a missing field) |
| 122 | `cvs --home relative-home` | `ROOT_NOT_FOUND`, kind ask, no path, in place of `NO_CV` at `home` | listed: README "The data folder" (13, 35); adx's own: a relative `--home` is refused |
| 123 | `cvs --home posting.txt` | `ROOT_NOT_FOUND`, kind ask, no path, for the relative path, in place of `NOT_A_FOLDER` at `home` | adx's own: a relative `--home` is refused (guide "Moving the folder") |
| 124 | `cvs --home` | refusal shape; adx's `MISSING_VALUE` wording and hint, with the command `oriko schema cvs` | adx's own: guide "The answer", "How adx reads a call" (a missing value) |
| 125 | `cvs --output yaml` | refusal shape; `NOT_IN_LIST` at `output` with the command `oriko --output`, in place of `UNKNOWN_OUTPUT` | adx's own: guide "What every tool gets" (the options adx adds), "Options and their values" (a value outside a list) |
| 129 | `cvs` in a home without `~/.oriko` | refusal shape; `NO_CV` with no path, message "The data folder holds no CV", hint "Check --home, or create a CV with the command and the fields it needs", command `oriko init`, in place of `oriko schema init` | listed: README "Hints across folders" (73), "A path cannot point into a stored file on its own"; log W3, W4 |
| 43, 71 | `plan --profile broken`, the same with `--output text` | `UNKNOWN_BLOCK` names `oriko show --profile broken --block`, the block ids of the CV of that profile, in place of adx's `oriko plan --profile` | listed: decision 79 (README "The hint for `UNKNOWN_BLOCK` takes the CV and the profile from the refused call"); passing: ends the passing difference of package 2 |
| 102 | `profile set --profile globex --json '{"cv":"jane","blocks":{"nobody":{"hidden":true}}}'` | `UNKNOWN_BLOCK` names `oriko show --cv jane --profile globex --block`: globex is stored since call 99, so the step carries it beside `--cv jane` | listed: decision 79; passing: ends the passing difference of package 6 |
| 81, 82, 85 to 97 | the 15 edits on `erika` that write | `cvs/erika.json` names `placeholder.png`, so the answer counts 2 bytes more, and the file keeps mode 600, the mode `init` gave it | listed: README "`init` writes one shared placeholder photo" (70); adx's own: guide "Files" (an updated file keeps its mode) |
| 83 | `item add --cv erika --json '{"block":"skills","value":"Rust"}' --dry-run` | the answer counts 2 bytes more, as the CV names `placeholder.png` | listed: README "`init` writes one shared placeholder photo" (70), in a record of another call on the same stored file (section 5 of the plan) |
| 106, 109 | `read --posting posting.txt --profile globex`, `read --posting other.txt --profile globex --replace` | `{ ok, applied: true, result: { read, profile, posting }, next }`: `written` is `applied`, `read` keeps its entries with `stored`, `posting` is `{ file, bytes, replaces }` of `profiles/globex.posting.md`, with `changes` on the replace of call 109; the step to `schema` says adx's "shows the schema of profile", and the step to `profile set` needs `cv` and `blocks` in place of `json`; the posting has mode 600 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`, and `changes` on a replace", "Steps to `schema`" (77); adx's own: guide "Next steps" (`needs` names input fields), "Files" (a new file gets 0600, a replaced one keeps its mode); passing: ends the passing line of call 106 |
| 107 | `read --posting posting.txt --profile globex` again | the answer of call 106 with `unchanged: true` in `posting` and `applied: true`, in place of `written: false`; nothing is written | listed: decision 81, the same bytes again write nothing; adx's own: guide "Files" (a real run that writes nothing answers `applied: true`) |
| 108 | `read --posting other.txt --profile globex` | refusal shape; `ALREADY_EXISTS` at no field, "profiles/globex.posting.md exists and holds other bytes", hint "add --replace to overwrite profiles/globex.posting.md", command the same call with `--replace --dry-run`, in place of `POSTING_EXISTS` at `posting` | listed: README "`ALREADY_EXISTS` replaces two codes" (10, 31); adx's own: guide "The answer", "A command that changes something" |
| 110 | `read --posting posting.txt` | refusal shape; `MISSING_OPTION` keeps its path, message and hint, and its command is `oriko read --posting posting.txt --profile`, which answers the names taken, in place of `oriko read --profile` | adx's own: guide "The answer", "Refusing bad input with a hint" (adx fills `command` at a field that has a source, with the fields of the call). The code keeps its name `MISSING_OPTION`: adx does not own it and starts with it declared (measured, W46), so it needs no name of its own |
| 111 | `read --posting http://example.com/job --profile globex` | refusal shape; `ADDRESS_NOT_ALLOWED` in place of `URL_NOT_ALLOWED`, with the same path, message and hint | a logged loss: W46, with the name of decision D21; adx's own: guide "The answer" |
| 112 | `read --posting https://127.0.0.1/job --profile globex` | refusal shape; `PRIVATE_ADDRESS` keeps its path, message and hint | adx's own: guide "The answer" |
| 113, 114 | `read --notes posting.txt --cv jane`, `read --notes posting.txt --notes other.txt --cv jane` | `{ ok, applied: true, result: { read, cv, notes }, next }`: `notes` is `{ file, bytes, replaces }` of `cvs/jane.notes.md`, with `changes` on the update of call 114; the step to `show` is the same; the notes have mode 600 | listed: README "One answer shape", "A write answers `{ file, bytes, replaces }`, and `changes` on a replace"; section 5 of the plan for the mode; adx's own: guide "Files" (a new file gets 0600, an updated one keeps its mode) |
| 115 | `read --resume other.txt` | `{ ok, applied: true, result: { read }, next }`, in place of `written: false`; the step to `init` needs `cv`, `language`, `firstName`, `lastName` and `role` in place of `cv` and `json`, and the step to `schema` says adx's "shows the schema of init" | listed: README "One answer shape", "Steps to `schema`" (77); adx's own: guide "Files" (a real run that writes nothing answers `applied: true`), "Next steps" (`needs` names input fields) |
| 116 | `read --resume missing.pdf` | refusal shape; `SOURCE_NOT_FOUND` in place of `FILE_NOT_FOUND`, with the same path, message and hint | listed: README "Five codes get a name of their own"; log W46; adx's own: guide "The answer" |
| 117 | `read` | refusal shape; `NOTHING_TO_READ` in place of `MISSING_INPUT`, with the same path, message, hint and command `oriko schema read` | listed: README "Five codes get a name of their own"; log W46; adx's own: guide "The answer" |

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
- D12, package 6
  question: a write of adx follows a link at its target to a file inside the root and changes
  that file (W18, W25, W34). With `profile set --replace` a link `profiles/NAME.json` to a stored
  CV replaced that CV, and no answer named it. What do the commands that write a place the call
  names do with such a link
  variants: (a) the loss is taken and logged, as W18 and W25 said; (b) a write whose target
  exists and is no regular file of the root's list is refused, before anything is staged
  choice: b, by `targetIssue` of `core/home.ts` for `profile set`, `photo set` and `build`, with
  oriko's code `TARGET_NOT_A_FILE`, kind fix, at the field that names the target
  reason: with (a) a stored file is replaced without a word; (b) reads nothing but adx's `exists`
  and `list` and weakens no check of adx. Measured: `exists` is true for a link to a file inside
  the root, false for a link that leads nowhere and for a folder, and a link that leads out of
  the root is adx's `PATH_OUTSIDE`; the list holds regular files only. So the refusal meets
  exactly the link adx writes through; the other three adx replaces or refuses itself. The old
  behavior, the link replaced by the new file, stays lost
- D13, package 6
  question: `photo set` writes two files, the photo and the file that names it. Does the check
  of D12 run for both
  variants: (a) for both; (b) for the photo only
  choice: b
  reason: the file that names the photo is a name the list of its folder answered, so it is a
  regular file already: a link `profiles/NAME.json` is `NOT_IN_LIST` at `profile` (measured), and
  a CV comes from the list of CVs. A second check would repeat the same question
- D14, package 6
  question: adx reads the input itself, up to 1,048,576 characters, and hands a handler its
  value. Today an input past 1,000,000 bytes is refused. Which limit holds for `profile set`
  and the edits
  variants: (a) adx's limit alone; (b) oriko counts the value as compact JSON against its own
  limit, with its own code `JSON_TOO_LARGE`
  choice: b
  reason: (b) keeps the limit a stored file has today as far as adx allows; an input that is
  larger only by its spaces passes now, at most up to adx's limit (W35)
- D15, package 6
  question: a profile whose content equals the stored one, in another key order or spacing,
  differs in its bytes, so adx answers `ALREADY_EXISTS`. What does `profile set` answer
  variants: (a) `ALREADY_EXISTS`, as adx compares; (b) the stored text is written back, so adx
  answers `unchanged: true`
  choice: b
  reason: decision 81 says the same profile again writes nothing, and the same content is the
  same profile; the cost is that `--replace` does not rewrite a stored profile whose spacing
  alone differs (W32)
- D16, package 7
  question: the plan says the pure code, the check of a CV and the page plan, raises issues of
  adx itself. Does it
  variants: (a) it keeps issues of its own, which `raised`, `turnedEach` and `issueAt` turn once
  the field of the call is known; (b) it raises issues of adx through a callback for the path;
  (c) it builds issues of adx without `code()`
  choice: a, so this part of the plan is not done
  reason: a public issue of adx shows its code, its path and its command only, so the `layout`
  of a successful answer, which holds code, path, message and hint as data (D10), cannot be
  built from one; and the file an issue lies in (D2) is decided by code and path before the
  issue has a field. (c) would go around the one way adx declares a code (W41)
- D17, package 7
  question: the hint of `UNKNOWN_BLOCK` carries `--cv` and `--profile` into `show`. adx checks
  each carried value alone, so with a stored profile of another CV the named command refused
  with `CV_MISMATCH`. How does the hint name a command that runs
  variants: (a) the source of `--profile` of `show` lists, beside a `--cv`, only the profiles
  of that CV and those that name none, so a profile of another CV falls out of the step; (b)
  the hint carries `--cv` alone, and loses the profile where only the profile names the CV;
  (c) the loss is logged
  choice: a
  reason: (a) keeps the hint whole in every command that raises the code. Its cost:
  `show --cv X --profile P` with a profile of another CV is `NOT_IN_LIST` at `profile`, where
  it was `CV_MISMATCH` at `cv` (W42)
- D18, package 7
  question: the source of `--block` needs the CV of the call. What does it answer when no CV
  can be shown
  variants: (a) an empty list, as the sketch; (b) the refusal of the CV, thrown as adx's
  `Refused`
  choice: b
  reason: with (a) `NO_CV`, `CV_REQUIRED`, `UNKNOWN_CV` and `SCHEMA` would all turn into
  `NOT_IN_LIST` with an empty list. (b) rests on adx answering a refusal a source throws as the
  refusal of the call, which its code does and its guide does not promise (W36)
- D19, package 7
  question: `init` loses two checks the old command ran: the byte limit of its input and the
  check of the new CV. Does it get them back
  variants: (a) both are called again; (b) neither
  choice: b
  reason: the input of `init` is a strict object of five bounded fields, so a call of the limit
  could never refuse, and a CV built from these fields cannot fail the check: both would be
  lines no input reaches. An input padded with spaces passes up to adx's own limit (W35)
- D20, package 7
  question: call 83, a dry run of `item add`, differs in the golden, outside the calls the plan
  lists for this package. Is that a bug
  variants: (a) a bug; (b) a listed change in a record of another call
  choice: b
  reason: the answer counts 2 bytes more, since the CV names `placeholder.png` in place of
  `cvs/erika.png`; the plan counted the 15 records that write the file and missed the one dry
  run on it
- D21, before package 8
  question: `read` raises codes adx owns, which a tool cannot declare. Which names do they get
  variants: (a) the names of the sketch where it has them, and for the rest a name after the
  thing, by the rule of D8; (b) one code for every refusal of a source
  choice: a. `MISSING_INPUT` is `NOTHING_TO_READ` and `FILE_NOT_FOUND` is `SOURCE_NOT_FOUND`
  (both of the sketch); `NOT_A_FILE` is `SOURCE_NOT_A_FILE`, `INPUT_TOO_LARGE` is
  `SOURCE_TOO_LARGE`, `URL_NOT_ALLOWED` is `ADDRESS_NOT_ALLOWED`, `NETWORK_FAILED` is
  `DOWNLOAD_FAILED` and `SERVER_BUSY` is `SITE_BUSY`, the last two of kind retry. A name changes
  only where adx refuses the declaration of the old one; a code adx does not own keeps its
  name. So `MISSING_OPTION` keeps its name: the sketch renames it to `PROFILE_NEEDED`, but adx
  accepts its declaration (measured in package 8), and the plan lists the new name as a change
  that may happen, not one that must
  reason: (b) would take from a caller the difference between a file to fix, an address to
  change and a download to repeat; (a) keeps one code per cause, as today
- D22, before package 8
  question: `conformance` calls the `example` of a command, and the example of `read` needs a
  source that is there. Which one
  variants: (a) a file of the package, relative to its root, read with the option that stores
  nothing; (b) an https address; (c) no example; (d) a posting of the package, relative to its
  root, stored beside a profile
  choice: first a, as D9 for `photo set`; changed to d in package 8
  reason: (b) would make a test load from the network, and (c) leaves the schema without a
  call an agent can copy. (a) cannot pass: the test kit of adx calls the example of every
  command that writes with `--replace`, and a call that stages no write refuses that option
  (adx `src/test/probes.ts`, measured). (d) writes only in the scratch folder of the kit and
  passes while the test runs in the root of the repository (W49); the test of the whole
  program is decided in package 9
- D23, package 8
  question: `--profile` of `read` names the file of a posting and, for notes, only picks a
  stored profile. Which names does it accept
  variants: (a) an id always; (b) an id beside `--posting`, any name a stored profile has for
  notes alone, as today
  choice: b
  reason: (a) refused a notes call that ran before and has no source in the plan. With (b) the
  check of the command holds the name to an id wherever it becomes a path, and for notes the
  name is only compared with the list of stored profiles, so no name reaches a path
