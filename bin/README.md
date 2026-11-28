# bin/

The front door: the program you start when you type `oriko`.

It connects the command line to the real world: the terminal, the data folder in your home
directory and the network. Everything else happens in
the other folders; this one only hands the call over to `cli/` and keeps its exit code.

[install.sh](../install.sh) links `~/.local/bin/oriko` to `bin/oriko.ts`, and the `bin` field of
[package.json](../package.json) names it, so this file never moves.

## Modules

- `oriko.ts`: runs a command that moved onto adx through the tool of `cli/oriko.ts`, and starts
  every other call with the real terminal, the data folder `~/.oriko` and the network.

## Example

```sh
node bin/oriko.ts schema   # from a clone of the repository
oriko schema               # after the install, through the link the installer makes
```

The second line runs `bin/oriko.ts` of the copy the installer keeps in `~/.local/share/oriko`.

## Connections

- **Uses:**
  - [cli/](../cli/README.md): imports `interim.ts`, `oriko.ts`, `run.ts`
  - [core/](../core/README.md): imports `files.limits.ts`, `files.ts`
- **Used by:** no folder.

---

[← Back to the README](../README.md)
