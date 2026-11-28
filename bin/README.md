# bin/

The front door: the program you start when you type `oriko`.

It hands the arguments of the call to the tool of `cli/`, and adx answers with its exit code.
Everything else happens in the other folders.

[install.sh](../install.sh) links `~/.local/bin/oriko` to `bin/oriko.ts`, and the `bin` field of
[package.json](../package.json) names it, so this file never moves.

## Modules

- `oriko.ts`: runs the tool of `cli/oriko.ts` on the arguments of the call; adx reads the
  terminal, stdin and the data folder `~/.oriko` for it.

## Example

```sh
node bin/oriko.ts schema   # from a clone of the repository
oriko schema               # after the install, through the link the installer makes
```

The second line runs `bin/oriko.ts` of the copy the installer keeps in `~/.local/share/oriko`.

## Connections

- **Uses:**
  - [cli/](../cli/README.md): imports `oriko.ts`
- **Used by:** no folder.

---

[← Back to the README](../README.md)
