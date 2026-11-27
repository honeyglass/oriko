# terminal/

The terminal style (`--style terminal`): the CV as framed text, in the terminal and as a file.

`oriko preview` draws every page as a sheet of text, so you see what goes on which page before
any file exists. The same sheets also become a Word file in a monospace font, one sheet per page.
On request, the last page names oriko and its author.

What each mark of the sheets means: [Terminal preview](../docs/terminal-preview.md).

## Modules

- `sheets.ts`: draws each page of the CV as a framed sheet of text, as `oriko preview` shows it.
- `docx.ts`: puts the same sheets into a Word file, one sheet per A4 page, in the font Fira Code.
- `credits.ts`: adds a short note to the last page that the CV was made with oriko, and by whom.

## Example

```sh
oriko preview --profile go-e-senior-backend
oriko build --profile go-e-senior-backend --style terminal --credits --out go-e-terminal.docx
```

`--credits` adds the note from `credits.ts`; `build` takes it only together with `--style terminal`.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `metrics.ts`,
    `place.old.ts`, `zip.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `credits.ts`, `docx.ts`, `sheets.ts`

---

[← Back to the README](../README.md)
