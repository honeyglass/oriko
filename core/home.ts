/**
 * The two folders oriko may use on adx, and the files a command finds in them.
 *
 * home, work: the data folder `~/.oriko`, and the working directory of the call.
 * cvFile, profileFile: the file of one CV and of one profile in the data folder.
 * cvNames, profileNames: the CVs and the profiles of the data folder, by name.
 *
 * `--home` and the variable ORIKO_HOME move the data folder; adx keeps every path inside it and
 * follows no link out of it. A missing default folder holds no CV and no profile.
 *
 * @example const names = await cvNames();
 */
import { cwd, envDir, root } from '@honeyglass/adx';

export const home = root('home', envDir('ORIKO_HOME'));
export const work = root('work', cwd);

export const cvFile = (name: string) => home.file(`cvs/${name}.json`);
export const profileFile = (name: string) => home.file(`profiles/${name}.json`);

export const cvNames = async () => (await home.list('cvs', '.json')).map(file => file.stem);
export const profileNames = async () =>
  (await home.list('profiles', '.json')).map(file => file.stem);
