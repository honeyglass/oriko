# read/

Turns a document into clean text: a job posting, your notes, or an old CV.

The document can be a PDF, a Word file, a web page or plain text, as a file or a link. This
folder reads it, turns hidden characters into spaces, and hands the text to the agent, which
tailors the CV from it. A posting is kept beside its profile, so you can always see what a
version was made for. Notes are kept beside their CV; an old CV is not kept.

A download only goes to a public address over https, and every file and download has a size
limit, because a document from outside can be anything.

## Modules

- `documents.ts`: runs `oriko read`, and stores the posting and the notes of one call, all or none.
- `text.ts`: tells from the content whether a document is PDF, Word, HTML or plain text, and picks
  its reader.
- `pdf.ts`: reads the text out of a PDF file.
- `docx.ts`: reads the text out of a Word file, and stops when it unpacks more than the limit.
- `html.ts`: turns a web page into Markdown, and prefers the job data that many job pages embed
  for search engines (JSON-LD).
- `clean.ts`: turns every character that would not show on screen into a space.
- `web.ts`: downloads a link over https, and checks every redirect on the way.
- `address.ts`: tells whether an address is public, so a download never reaches a private network.
- `issues.ts`: the problems `oriko read` reports, each with a hint on what to do next.
- `limits.ts`: the limits on a Word file's unpacked text, and on the redirects and time of a
  download.

## Example

```sh
oriko read --profile backend-job --posting ~/Downloads/backend-job.pdf
oriko read --cv jane-doe --notes career-notes.md
oriko read --resume old-cv.docx
```

Each call answers the text as JSON; [the command list](../docs/cli.md) says where each is stored.

## Connections

- **Uses:**
  - [core/](../core/README.md): imports `cv.schema.ts`, `errors.ts`, `files.limits.ts`, `files.ts`,
    `home.old.ts`, `issues.old.ts`
- **Used by:**
  - [bin/](../bin/README.md): imports `web.ts`
  - [cli/](../cli/README.md): imports `documents.ts`, `limits.ts`, `web.ts`

---

[← Back to the README](../README.md)
