# pdf/

Turns a Word file into a PDF, through LibreOffice on your own computer.

oriko writes .docx files. When you ask for a PDF, this folder hands the file to LibreOffice
with the fonts from `assets/fonts/`, so lines and pages break where Google Docs breaks them.
Where the PDF still differs: [Compatibility](../docs/compatibility.md). Without LibreOffice,
the answer says how to install it, or to save the .docx as PDF in Google Docs instead.
[install.sh](../install.sh) asks `convert.ts` where LibreOffice may be installed.

## Modules

- `convert.ts`: hands a Word file to LibreOffice and returns the PDF, and knows where each system
  installs LibreOffice.
- `issues.ts`: the errors this folder reports: LibreOffice is missing, or it wrote no PDF.
- `limits.ts`: how long one run of LibreOffice may take.

## Example

```sh
oriko build --profile go-e-senior-backend --out go-e.pdf
```

A file name that ends in `.pdf` sends the Word file through this folder.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `issues.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `convert.ts`, `limits.ts`

---

[← Back to the README](../README.md)
