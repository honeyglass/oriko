# classic/

The classic style (`--style classic`, the default): the CV as a Word file in two columns, with
your photo.

It turns the page plan from `core/` into a .docx. For a PDF it sets a few distances differently,
so the PDF from LibreOffice matches the one from Google Docs. Blocks with a timeline, such as jobs
and education, stand on the left; all others, such as skills and languages, on the right. The
photo sits round at the top, and the icons of the contact lines and jobs come from `assets/`.

The photo lives here too, since only this style shows it: `oriko photo set` takes any PNG or JPEG
and stores it as the square picture the CV uses.

## Modules

- `docx.ts`: writes the classic CV as a Word file, one table per page, for Google Docs or for
  LibreOffice.
- `photo.ts`: runs `oriko photo set`, which stores a picture as the photo of a CV or of one profile.
- `images.ts`: makes the square photo that `photo set` stores, and the round photo and the plain
  color bar of the file.
- `issues.old.ts`: the errors this folder reports, such as a photo that is no PNG or JPEG.

## Example

```sh
oriko photo set portrait.jpg                                  # the photo of your CV
oriko build --profile go-e-senior-backend --out go-e.docx     # classic is the default style
```

The build reads the stored photo and makes it round in the file.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `files.ts`, `home.old.ts`, `issues.old.ts`, `measure.ts`, `metrics.ts`,
    `place.old.ts`, `zip.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `docx.ts`, `photo.ts`

---

[← Back to the README](../README.md)
