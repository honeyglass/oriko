import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { codeOf } from '../../tools/readmes/code.ts';
import type { Code } from '../../tools/readmes/code.ts';
import { repository } from '../utils/repository.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** The folders with rules of their own; every other top-level folder with code is a feature. */
const SHELL = new Set(['bin', 'cli', 'tests', 'tools']);

// Each import from one top-level folder that leaves the allowed folders.
function crossings(code: Code, folder: string, allowed: Set<string>) {
  return code.edges
    .filter(edge => edge.from === folder && allowed.has(edge.to) === false)
    .map(edge => `${folder}/${edge.file} imports ${edge.spec}`);
}

// Every top-level folder that holds a .ts file and has no rule of its own.
function features(code: Code) {
  return code.folders
    .filter(name => SHELL.has(name) === false && name !== 'core')
    .filter(name => (code.files.get(name) ?? []).some(file => file.endsWith('.ts')));
}

// Each import of a maintainer tool from outside tests, so no tool ends up in what users run.
function toolImports(code: Code) {
  return code.edges
    .filter(edge => edge.to === 'tools' && edge.from !== 'tests')
    .map(edge => `${edge.from}/${edge.file} imports ${edge.spec}`);
}

const code = codeOf(ROOT);

test('reads every import of the repository', () => {
  assert.deepEqual(code.issues, []);
});

test('a feature imports only core and itself', () => {
  const found = features(code).flatMap(name => crossings(code, name, new Set(['core', name])));
  assert.deepEqual(found, []);
});

test('core imports only core', () => {
  assert.deepEqual(crossings(code, 'core', new Set(['core'])), []);
});

test('only tests import from tools', () => {
  assert.deepEqual(toolImports(code), []);
});

test('names a feature that imports another feature, and counts a new folder as a feature', () => {
  const root = repository({
    'core/errors.ts': 'export const x = 1;\n',
    'classic/docx.ts': "import { x } from '../core/errors.ts';\n",
    'brand-new/a.ts': "import { y } from '../classic/docx.ts';\n",
  });
  const found = codeOf(root);
  assert.deepEqual(features(found), ['brand-new', 'classic']);
  assert.deepEqual(crossings(found, 'brand-new', new Set(['core', 'brand-new'])), [
    'brand-new/a.ts imports ../classic/docx.ts',
  ]);
  assert.deepEqual(crossings(found, 'classic', new Set(['core', 'classic'])), []);
  rmSync(root, { recursive: true });
});

test('names the cli when it imports a maintainer tool', () => {
  const root = repository({ 'cli/oriko.ts': "import { readmes } from '../tools/readmes/x.ts';\n" });
  assert.deepEqual(toolImports(codeOf(root)), ['cli/oriko.ts imports ../tools/readmes/x.ts']);
  rmSync(root, { recursive: true });
});

test('sees every import form, and names an import() it cannot follow', () => {
  const root = repository({
    'a/a.ts': [
      "import type { T } from '../core/types.ts';",
      'export * from "../core/x.ts";',
      "import '../side/effect.ts';",
      "const lazy = await import('../lazy/load.ts');",
      "type U = import('../types/t.ts').T;",
      'const named = await import(lazy.name);',
    ].join('\n'),
  });
  const found = codeOf(root);
  assert.deepEqual(
    found.edges.map(edge => edge.to),
    ['core', 'core', 'side', 'lazy', 'types'],
  );
  assert.deepEqual(
    found.issues.map(issue => [issue.code, issue.path]),
    [['DYNAMIC_IMPORT', 'a/a.ts']],
  );
  rmSync(root, { recursive: true });
});
