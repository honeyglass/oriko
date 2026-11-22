# Contributing

Pull requests and ideas are welcome. Before you build a new feature or change how oriko behaves,
[open an issue](https://github.com/honeyglass/oriko/issues/new) so we can talk it through first.
Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- **Node 26**, the newest LTS, for development. oriko itself runs on Node 24 and up.
- **pnpm**, in the version `packageManager` in [package.json](package.json) pins.
- **LibreOffice**, optional: the PDF tests run only when it is installed, and are skipped without it.

[flake.nix](flake.nix) brings Node 26 and pnpm: run `nix develop`, or with direnv run
`direnv allow` once, and every `cd` into the folder loads them. Then install and try oriko on the
sample data, which never touches a CV of yours:

```sh
pnpm install --frozen-lockfile
node bin/oriko.ts schema --home examples
```

## How the code is laid out

The code is cut by feature, so a change to one feature touches one folder. A feature folder, such
as `classic/` or `read/`, imports only from `core/` and from itself; `cli/` is the one folder that
combines several features. [layout.api.spec.ts](tests/api/layout.api.spec.ts) fails on a forbidden
import. The other rules, such as where constants and issues go, stand in [CLAUDE.md](CLAUDE.md).

Every top-level folder has a README that says what it is for, such as [core/](core/README.md) or
[cli/](cli/README.md). `pnpm readmes` writes its file list and its connections from the code; you
write the sentence after each file name. How that works: [tools/readmes/](tools/readmes/README.md).

## Development

```sh
pnpm test                                  # api and internals tests, fails below 95 % coverage
node --test tests/api/check.api.spec.ts    # one test file
pnpm run typecheck
pnpm run format:check
pnpm readmes                  # writes the file lists of the folder READMEs; --check only compares
sh tests/e2e/install.e2e.sh   # the install script in empty home folders, on the last commit
pnpm baselines:update         # new Google PDFs and page images for changed showcase files (macOS)
pnpm behavior:update          # records the program's answers again, after a change on purpose
```

The install test clones this checkout, so it sees committed changes only. How to sign gws in once
for `baselines:update`: [Baselines](docs/baselines.md).

## Before you open a pull request

Make sure these pass:

```sh
pnpm readmes --check
pnpm test
pnpm run typecheck
pnpm run format:check
```

Write each commit message as a [Conventional Commit](https://www.conventionalcommits.org), such as
`fix(core): refuse a profile that changes a fact of its master`. The description of a pull request
is its commit message, so it says what changes and why.

## License

By contributing, you agree that your contribution is licensed under the
[AGPL-3.0](LICENSE), the license of oriko. The files in [brand/](brand/README.md) are the
project's identity and stay outside that license.
