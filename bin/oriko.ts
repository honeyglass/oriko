#!/usr/bin/env node
/**
 * The program `oriko`: the tool of cli/oriko.ts, run on the arguments of the call.
 *
 * @example oriko plan --profile acme
 */
import { oriko } from '../cli/oriko.ts';

await oriko.main();
