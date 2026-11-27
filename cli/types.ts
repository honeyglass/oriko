/**
 * The types the parts of the cli share: its surroundings, one call, and the fields of an answer.
 *
 * Io: what the cli needs from its surroundings, so a test can stand in for the terminal.
 * Call: one call with its data folder, its option values, its words and its command.
 * Fields: the fields of a successful answer.
 *
 * @example const call: Call = { io, home, values, rest: found.rest, command: found.name };
 */
import type { Web } from '../read/web.ts';
import type { Values } from './args.ts';
import type { CommandName } from './commands.ts';

export type Io = {
  /** The data folder: every CV in cvs/ and every profile in profiles/. */
  home: string;
  cwd: string;
  isTTY: boolean;
  /** The network a download goes through. */
  web: Web;
  /** The text piped in, or null when nothing is piped. */
  stdin: () => Promise<string | null>;
  write: (text: string) => void;
};

export type Fields = Record<string, unknown>;

export type Call = {
  io: Io;
  home: string;
  values: Values;
  /** The words after the command; every word when the call names none. */
  rest: string[];
  command?: CommandName;
};
