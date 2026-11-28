/**
 * The problems pnpm readmes finds, each made by one function.
 *
 * Issue: one problem, with the file it lies in.
 * dynamicImport: what the reading of the code finds.
 * noReadme, noSection, twoSections, unreadableSection, html, unstable: a README the tool cannot use.
 * noSentence, deadLink, noPage: what a README still lacks, points to in vain, or a page to check
 * that does not exist.
 *
 * Every issue fails the check: what the tool cannot read is a problem, never a skip.
 *
 * @example issues.push(issue.noSentence('cli/README.md', 'oriko.ts'));
 */

export type Issue = { code: string; path: string; message: string };

export const dynamicImport = (path: string): Issue => ({
  code: 'DYNAMIC_IMPORT',
  path,
  message: 'An import() names no fixed path, so no tool can tell which folder it reaches',
});

export const noReadme = (path: string): Issue => ({
  code: 'NO_README',
  path,
  message: 'The folder holds code but has no README; write one with the sections of CLAUDE.md',
});

export const noSection = (path: string, title: string): Issue => ({
  code: 'NO_SECTION',
  path,
  message: `The README has no "## ${title}"; add the heading, and pnpm readmes fills it`,
});

export const twoSections = (path: string, title: string): Issue => ({
  code: 'TWO_SECTIONS',
  path,
  message: `The README has "## ${title}" twice; keep one`,
});

export const unreadableSection = (path: string, title: string): Issue => ({
  code: 'UNREADABLE_SECTION',
  path,
  message: `"## ${title}" is not one flat list of "- \`file\`: sentence"; nothing was changed`,
});

export const html = (path: string): Issue => ({
  code: 'HTML',
  path,
  message: 'The README holds HTML, whose links no Markdown parser sees; write it as Markdown',
});

export const unstable = (path: string): Issue => ({
  code: 'UNSTABLE',
  path,
  message: 'A second run would change the README again; this is a bug of pnpm readmes',
});

export const noSentence = (path: string, file: string): Issue => ({
  code: 'NO_SENTENCE',
  path,
  message: `\`${file}\` has no sentence; write what it does after its colon`,
});

export const noPage = (path: string): Issue => ({
  code: 'NO_PAGE',
  path,
  message: 'The page whose links should be checked does not exist; fix the path in the options',
});

export const deadLink = (path: string, line: number, destination: string): Issue => ({
  code: 'DEAD_LINK',
  path: `${path}:${line + 1}`,
  message: `The link ${destination} leads to no file or heading in the repository`,
});
