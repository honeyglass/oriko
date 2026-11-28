/**
 * LibreOffice in a test: a program that answers as its soffice does, so no test needs LibreOffice.
 *
 * fakeSoffice: a script that writes a small PDF where soffice puts it, or one that fails.
 *
 * @example t.mock.method(libreOffice, 'program', async () => fakeSoffice(folder, 'writes'));
 */
import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// soffice reads the source as its last argument and writes <source>.pdf into --outdir.
const SCRIPTS = {
  writes: `#!/bin/sh
while [ $# -gt 1 ]; do
  if [ "$1" = --outdir ]; then out=$2; fi
  shift
done
printf '%%PDF-1.7 fake' > "$out/$(basename "$1" .docx).pdf"
`,
  fails: `#!/bin/sh
echo 'Error: source file could not be loaded' >&2
exit 1
`,
};

/**
 * @param folder - where the script goes
 * @param mode - whether the script writes a PDF or fails
 * @returns the path of the script
 */
export function fakeSoffice(folder: string, mode: keyof typeof SCRIPTS) {
  const path = join(folder, `soffice-${mode}`);
  writeFileSync(path, SCRIPTS[mode]);
  chmodSync(path, 0o755);
  return path;
}
