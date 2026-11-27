#!/usr/bin/env node
/**
 * The program `oriko`: a moved command on adx, every other one on the cli wired to the terminal.
 *
 * @example oriko plan --profile acme
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { pipedText } from '../core/files.ts';
import { onAdx } from '../cli/interim.ts';
import { oriko } from '../cli/oriko.ts';
import { run } from '../cli/run.ts';
import { sofficePaths } from '../pdf/convert.ts';
import { NODE_WEB } from '../read/web.ts';

const argv = process.argv.slice(2);

if (onAdx(argv)) await oriko.main();
else
  process.exitCode = await run(argv, {
    home: join(homedir(), '.oriko'),
    cwd: process.cwd(),
    web: NODE_WEB,
    soffice: sofficePaths(),
    isTTY: process.stdout.isTTY === true,
    stdin: async () =>
      process.stdin.isTTY === true ? null : pipedText(process.stdin, FILE_LIMITS.inputBytes),
    write: output => process.stdout.write(output),
  });
