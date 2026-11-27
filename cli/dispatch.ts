/**
 * The routing of a checked call to its command, and the thin adapters of the commands.
 *
 * dispatched: the answer of the command a call names.
 *
 * @example const result = await dispatched(call);
 */
import { done } from '../core/errors.ts';
import type { Result } from '../core/errors.ts';
import { cvNames, profileNames } from '../core/home.old.ts';
import { profileCv } from '../core/load.old.ts';
import { createCv } from '../cv/init.ts';
import { listCvs } from '../cv/list.ts';
import { showCv } from '../cv/show.ts';
import { saveEdit } from '../edit/save.ts';
import { readDocuments } from '../read/documents.ts';
import { setProfile } from '../profile/set.ts';
import { showProfile } from '../profile/show.ts';
import { listProfiles } from '../profile/list.ts';
import { actionsOf } from './route.ts';
import { schema } from './describe.ts';
import { payload } from './input.ts';
import type { Call, Fields } from './types.ts';

export async function dispatched(call: Call): Promise<Result<Fields>> {
  switch (call.command) {
    case undefined:
      return unrouted(call);
    case 'schema':
      return schema(call.rest.join(' '));
    case 'cvs':
      return listCvs(call.home);
    case 'init':
      return init(call);
    case 'show':
      return showCv(call.home, call.values.cv, call.values.profile, call.values.block);
    case 'profiles':
      return listProfiles(call.home, call.values.cv);
    case 'read':
      return read(call);
    case 'profile set':
      return profileSet(call);
    case 'profile show':
      return showProfile(call.home, call.values.profile);
    // plan, preview, build and photo set run on adx: cli/interim.ts never sends them here, so
    // only the edits are left.
    default:
      return edit(call, call.command);
  }
}

// A call without a command, which commandIssues let through: the start, or a group alone.
async function unrouted(call: Call): Promise<Result<Fields>> {
  const [group] = call.rest;
  if (group === undefined) return start(call);
  return done({ command: group, values: actionsOf(group) });
}

// Where a caller stands: the data folder with its CVs and profiles, empty lists when it has none.
async function start(call: Call): Promise<Result<Fields>> {
  return done({
    home: call.home,
    cvs: await cvNames(call.home),
    profiles: await profileNames(call.home),
  });
}

async function init(call: Call): Promise<Result<Fields>> {
  const input = await payload(call, 'init');
  if (input.error !== null) return input;
  const isDryRun = call.values['dry-run'] === true;
  return createCv({ home: call.home, name: call.values.cv, input: input.data, isDryRun });
}

async function profileSet(call: Call): Promise<Result<Fields>> {
  const input = await payload(call, 'profile set');
  if (input.error !== null) return input;
  return setProfile({
    home: call.home,
    name: call.values.profile,
    input: input.data,
    isReplace: call.values.replace === true,
    isDryRun: call.values['dry-run'] === true,
  });
}

async function read(call: Call): Promise<Result<Fields>> {
  const { values } = call;
  return readDocuments({
    home: call.home,
    cwd: call.io.cwd,
    web: call.io.web,
    posting: values.posting,
    notes: values.notes ?? [],
    resume: values.resume,
    profile: values.profile,
    cv: values.cv,
    profileCv: await profileCv(call.home, values.profile),
    isReplace: values.replace === true,
    isDryRun: values['dry-run'] === true,
  });
}

async function edit(call: Call, command: string): Promise<Result<Fields>> {
  const input = await payload(call, command);
  if (input.error !== null) return input;
  return saveEdit({
    home: call.home,
    cv: call.values.cv,
    command,
    input: input.data,
    isDryRun: call.values['dry-run'] === true,
  });
}
