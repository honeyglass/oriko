# 🧪 Sample data

Try oriko without your own data. The folder [`examples/`](../examples/) is a complete data folder:

```text
examples/
  cvs/            three CVs with their photos: jane-doe, lukas-berger, marco-weber
  profiles/       one version per job posting: go-e-senior-backend, davita-it-project-manager, galeria-cook
  showcase/       the posting, the agent's report and the built files of each version
```

Add `--home` with that folder to any command. After the quickstart, the folder lies in
`~/.local/share/oriko/examples`:

```sh
oriko cvs --home ~/.local/share/oriko/examples
oriko preview --profile galeria-cook --home ~/.local/share/oriko/examples
oriko build --profile galeria-cook --home ~/.local/share/oriko/examples --out galeria-cook.docx
```

`build` writes the Word file into the folder you run it in. After a manual installation, run the
commands in the oriko folder with `node bin/oriko.ts` and `--home "$PWD/examples"`.

> [!TIP]
> To change the sample data, for example with `block add`, copy the folder first with
> `cp -R ~/.local/share/oriko/examples ~/oriko-examples` and use `--home ~/oriko-examples`. The
> install script updates the oriko folder with git, which stops when a file you changed has
> changed in oriko as well.

---

[← Back to the README](../README.md)
