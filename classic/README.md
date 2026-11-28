# classic/

The classic style (`--style classic`, the default): the CV as a Word file in two columns, with
your photo.

It turns the page plan from `core/` into a .docx. For a PDF it sets a few distances differently,
so the PDF from LibreOffice matches the one from Google Docs. Blocks with a timeline, such as jobs
and education, stand on the left; all others, such as skills and languages, on the right. The
photo sits round at the top, and the icons of the contact lines and jobs come from `assets/`.

The photo lives here too, since only this style shows it: `oriko photo set --file <picture>` takes
any PNG or JPEG, anywhere on the disk, and stores it as the square picture the CV uses. It runs on
the toolkit `@honeyglass/adx`, which writes nothing when a check refuses the call. Otherwise adx
writes the photo and the CV or profile that names it whole beside their places and moves them in
one after the other; the two moves are not one step, and when the second fails, the answer says
that the photo is already in place.

## Modules

- `docx.ts`: writes the classic CV as a Word file, one table per page, for Google Docs or for
  LibreOffice.
- `photo.ts`: runs `oriko photo set` on adx, which stores a picture as the photo of a CV or of one
  profile.
- `images.ts`: reads the picture `photo set` names and makes the square photo it stores, and makes
  the round photo and the plain color bar of the file.
- `issues.ts`: the errors of a stored photo that is no PNG or JPEG, and of a picture `photo set`
  cannot read.

## Example

```sh
oriko photo set --file ~/Pictures/portrait.jpg --replace    # the photo of your CV
oriko build --profile go-e-senior-backend --out go-e.docx   # classic is the default style
```

A stored photo is kept data, so a new one replaces it only with `--replace`. The build reads the
stored photo and makes it round in the file.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `cv.limits.ts`, `cv.schema.ts`, `errors.ts`,
    `files.limits.ts`, `files.ts`, `home.ts`, `issues.ts`, `load.ts`, `measure.ts`, `metrics.ts`,
    `options.ts`, `place.ts`, `sources.ts`, `zip.ts`
- **Used by:**
  - [cli/](../cli/README.md): imports `docx.ts`, `photo.ts`

---

[← Back to the README](../README.md)
