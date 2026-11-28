# examples/

A complete data folder with made-up people, to try oriko without a CV of your own.

`cvs/` and `profiles/` are laid out like your own `~/.oriko`, so every command runs against them
with `--home "$PWD/examples"` from the root of the repository. `showcase/` holds one agent run per example: the job posting, the
agent's report, the preview, and the built files in both styles.

The tests compare the builds of the examples with the showcase files. A tour of the examples:
[Examples](../docs/examples.md).

## Contents

- `cvs/`: three made-up CVs, each a JSON file with its photo beside it.
- `profiles/`: one version per job posting; each names its CV in `"cv"`.
- `showcase/`: one folder per profile, named like the profile. Each folder holds:
  - `posting.md`: the job posting, summarized, with a link to the source.
  - `report.md`: the agent's report on what it changed and why.
  - `preview.txt`: the terminal preview of every page.
  - `<profile>.docx` and `<profile>-terminal.docx`: the Word files in the classic and the
    terminal style.
  - `<profile>.pdf` and `<profile>-terminal.pdf`: the PDFs Google Docs made from those Word files.
  - `page-1.png` and `terminal-page-1.png`, one per page: pictures of the pages of those PDFs.
  - `google.json`: the sha256 of each Word file its PDF was made from.
  - `terminal-excerpt.png` and `terminal-excerpt-dark.png`, only for `go-e-senior-backend`: the
    top of page 1 that the README shows.

## Example

```sh
node bin/oriko.ts cvs --home "$PWD/examples"
node bin/oriko.ts profiles --home "$PWD/examples"
node bin/oriko.ts preview --profile galeria-cook --home "$PWD/examples"
node bin/oriko.ts plan --profile galeria-cook --home "$PWD/examples"
```

Run these from the root of the repository; [Sample data](../docs/sample-data.md) shows the same
for an installed oriko.

## Connections

- **Used by:**
  - [tests/](../tests/README.md) builds every profile and compares the Word files and PDFs with
    `showcase/`.
  - [tools/](../tools/README.md) renews the Google PDFs and page pictures with
    `pnpm baselines:update`.
  - The [README](../README.md) and [Examples](../docs/examples.md) show the showcase files;
    [Sample data](../docs/sample-data.md) and [Baselines](../docs/baselines.md) describe the
    folder.
  - The example of [assets/](../assets/README.md) quotes a contact line of `cvs/jane-doe.json`.

---

[← Back to the README](../README.md)
