import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { COMMANDS } from '../../cli/commands.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SKILL = join(ROOT, '.claude/skills/oriko');

// The skill and its references, as the agent reads them.
function skillText() {
  const references = readdirSync(join(SKILL, 'references')).filter(name => name.endsWith('.md'));
  const paths = ['SKILL.md', ...references.map(name => join('references', name))];
  return paths.map(path => readFileSync(join(SKILL, path), 'utf8')).join('\n');
}

// The text the skill marks as code: fenced blocks, `backticks` and 'single quotes'. A single
// quote opens only after a non-word character and closes only before one, so the apostrophe of
// "user's" opens nothing.
function spans(text: string) {
  const fenced = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(match => match[1] ?? '');
  const rest = text.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  const ticked = [...rest.matchAll(/`([^`\n]+)`/g)].map(match => match[1] ?? '');
  const quoted = [...rest.matchAll(/(?<![\w'])'([^'\n]+)'(?!\w)/g)].map(match => match[1] ?? '');
  return { fenced, inline: [...ticked, ...quoted] };
}

const KNOWN = new Set<string>(Object.keys(COMMANDS));

// Each 'oriko <command>' a span names, as the command it resolves to: a two-word command first,
// such as 'photo set', then a one-word one. A name oriko does not know stays as written.
function commands(text: string) {
  const { fenced, inline } = spans(text);
  const named = [...fenced, ...inline].flatMap(span => [
    ...span.matchAll(/(?<![\w$/.-])oriko(?![\w.-])((?:[ \t]+[a-z][a-z-]*){0,2})/g),
  ]);
  return named.map(match => {
    const words = (match[1] ?? '')
      .trim()
      .split(/\s+/)
      .filter(word => word !== '');
    const two = words.slice(0, 2).join(' ');
    if (KNOWN.has(two)) return two;
    return words.length === 0 || KNOWN.has(words[0] ?? '') ? (words[0] ?? '') : two;
  });
}

// Each span that is an issue code as a whole, such as 'PAGE_OVERFLOW' or `NO_CV`.
const codes = (text: string) =>
  spans(text).inline.filter(span => /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(span));

// Every code an issue can carry: a 'code:' literal, or a constant that holds its own name, in
// each folder's issues.ts or issues.old.ts and in core.
function issueCodes() {
  const folders = readdirSync(ROOT, { withFileTypes: true }).filter(entry => entry.isDirectory());
  const issues = folders
    .flatMap(folder => [join(folder.name, 'issues.ts'), join(folder.name, 'issues.old.ts')])
    .filter(path => existsSync(join(ROOT, path)));
  const core = readdirSync(join(ROOT, 'core'))
    .filter(name => name.endsWith('.ts'))
    .map(name => join('core', name));
  const sources = [...new Set([...issues, ...core])].map(path =>
    readFileSync(join(ROOT, path), 'utf8'),
  );
  return new Set(
    sources.flatMap(source => [
      ...[...source.matchAll(/code:\s*'([A-Z][A-Z0-9_]*)'/g)].map(match => match[1]),
      ...[...source.matchAll(/export const ([A-Z][A-Z0-9_]*) = '\1'/g)].map(match => match[1]),
    ]),
  );
}

test('every oriko command the skill names is a command of the CLI', () => {
  const named = commands(skillText());
  assert.ok(named.includes('profile set'), 'the skill names oriko profile set');
  const unknown = named.filter(name => name !== '' && KNOWN.has(name) === false);
  assert.deepEqual(
    [...new Set(unknown)].map(name => `oriko ${name}`),
    [],
  );
});

test('every issue code the skill names is a code oriko raises', () => {
  const named = codes(skillText());
  assert.ok(named.includes('ITEM_NOT_IN_MASTER'), 'the skill names ITEM_NOT_IN_MASTER');
  const known = issueCodes();
  assert.deepEqual([...new Set(named.filter(code => known.has(code) === false))], []);
});

test('reads commands and codes only from code spans, and keeps unknown ones as written', () => {
  const text = [
    "oriko keeps one master; the user's 'oriko plan' and `oriko photo set <file> --cv NAME`.",
    "`oriko plna --cv` and 'oriko block' and '$ORIKO_REPO/bin/oriko.ts' and `~/.oriko`.",
    "Codes: 'PAGE_OVERFLOW', `NO_CV`, 'SCHEMA', 'NO_SUCH_CODE' and PAGE_OVERFLOW in prose.",
    '```bash\noriko cvs\n```',
  ].join('\n');
  assert.deepEqual(commands(text).sort(), ['block', 'cvs', 'photo set', 'plan', 'plna']);
  assert.deepEqual(codes(text).sort(), ['NO_CV', 'NO_SUCH_CODE', 'PAGE_OVERFLOW', 'SCHEMA']);
  assert.equal(issueCodes().has('NO_SUCH_CODE'), false);
  assert.equal(issueCodes().has('NOT_INSTALLED'), true);
});
