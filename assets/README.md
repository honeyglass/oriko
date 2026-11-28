# assets/

The pictures of the classic style, and the fonts LibreOffice gets for a PDF.

The small icons mark the contact lines and the jobs, and the placeholder stands in for the photo
until you set your own. The fonts in `fonts/` are the ones Google Docs uses, or a stand-in with the
same widths, so LibreOffice sets lines and pages the same way. Where each font comes from:
[fonts/README.md](fonts/README.md); where the PDF still differs:
[Compatibility](../docs/compatibility.md).

## Contents

- `pin.png`, `home.png`, `phone.png`, `mail.png`, `globe.png`: the icons in front of the contact
  lines of the classic CV.
- `job-pin.png`: the mark in front of each job in the classic CV.
- `placeholder.png`: the photo a new CV gets from `oriko init` until you set your own.
- `fonts/`: the font files LibreOffice gets for a PDF, each with its license.

## Example

```json
{ "icon": "phone", "lines": ["+49 (0) 30 000 000"] }
```

This contact line from `examples/cvs/jane-doe.json` gets `phone.png` in front of the number.

## Connections

- **Uses:** nothing outside itself.
- **Used by:** [classic/](../classic/README.md) puts the icons into the Word file and names the
  placeholder in the example of `oriko photo set`, [cv/](../cv/README.md) copies the placeholder
  for a new CV, and [pdf/](../pdf/README.md) hands `fonts/` to LibreOffice.

---

[← Back to the README](../README.md)
