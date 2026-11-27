/**
 * The command oriko schema: the commands, options and shapes a caller needs to find its way.
 *
 * schema: everything without a name, and one command or shape with one.
 *
 * @example return schema(call.rest.join(' '));
 */
import { shown } from '@honeyglass/utils/ts';
import { z } from 'zod';
import { done, rejected } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import * as issue from './issues.old.ts';
import { CV_LIMITS, ICONS, KINDS } from '../core/cv.limits.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { OPTIONS } from '../core/options.old.ts';
import { READ_LIMITS } from '../read/limits.ts';
import { PDF_LIMITS } from '../pdf/limits.ts';
import { COMMANDS, EVERYWHERE, SHAPES } from './commands.ts';
import type { Command } from './commands.ts';
import { isCommandName, isShapeName } from './route.ts';
import type { Fields } from './types.ts';

// One object for the caller, in the key order schema has always shown.
const LIMITS = { ...CV_LIMITS, ...FILE_LIMITS, ...READ_LIMITS, ...PDF_LIMITS };

// Without a name: everything a caller needs to find its way. With one: a command or a shape.
export function schema(name: string): Result<Fields> {
  if (name === '') {
    const options = Object.fromEntries(
      Object.entries(OPTIONS).map(([key, spec]) => [key, spec.text]),
    );
    return done({
      commands: Object.keys(COMMANDS),
      options,
      schemas: Object.keys(SHAPES),
      kinds: KINDS,
      icons: ICONS,
      limits: LIMITS,
    });
  }
  if (isShapeName(name)) return done({ name, input: z.toJSONSchema(SHAPES[name]) });
  if (isCommandName(name) === false) return rejected('schema', [issue.unknownSchema(name)]);
  const command: Command = COMMANDS[name];
  const options = Object.fromEntries(
    [...command.options, ...EVERYWHERE].map(option => [option, OPTIONS[option].text]),
  );
  const input = command.input === undefined ? null : z.toJSONSchema(command.input);
  return done({
    name,
    does: command.does,
    options,
    required: command.required ?? [],
    requiredWith: command.requiredWith ?? {},
    words: command.words ?? [],
    input,
  });
}
