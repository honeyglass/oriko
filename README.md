<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/header-dark.svg">
  <img src="brand/header.svg" alt="oriko" width="520">
</picture>

**One CV, made to fit every job posting, laid out so no job ever breaks across a page.**

[Quickstart](#-quickstart) · [Docs](#-docs) · [Examples](docs/examples.md) · [CLI](docs/cli.md) · [Report an issue](https://github.com/honeyglass/oriko/issues)

[![skills.sh](https://skills.sh/b/honeyglass/oriko?label=skills.sh&labelColor=2b2d42&color=5cc9a7)](https://skills.sh/honeyglass/oriko)
![Agent Driven](https://img.shields.io/badge/Agent_Driven-purple.svg)
![Version](https://img.shields.io/github/package-json/v/honeyglass/oriko?label=version&color=blue)
![License](https://img.shields.io/github/license/honeyglass/oriko?color=green)
![Node](https://img.shields.io/badge/node-24+-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-%E2%89%A595%25-brightgreen.svg)
[![CI](https://github.com/honeyglass/oriko/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/honeyglass/oriko/actions/workflows/ci.yml)

</div>

---

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/file-text-dark.svg"><img src="brand/icons/file-text.svg" width="24" height="24" alt=""></picture> What is oriko?

oriko makes a fitting version of your CV for every job you apply to. You write your CV once,
with your jobs, skills, languages and contact details. When you find a job you like, you give the
posting to an AI assistant, in plain words and in any language. The assistant fits your CV to
it: it moves the matching skills up, hides what does not help and shortens long lists, and it
never invents anything. You see the result right away as a preview of every page in the
terminal, and you get a Word file that you open in Google Docs and save as PDF, or the PDF itself
when LibreOffice is installed.

### Why oriko?

- 🤖 **Built for AI assistants**: an agent drives oriko on its own, from your CV to the file.
- 🧱 **Clean pages**: a job never breaks across two pages; it moves on as a whole.
- 🎯 **One CV, many versions**: a small file per posting; a new job reaches every version.
- ✅ **Honest by design**: a version only hides, reorders and shortens what you wrote.
- 👀 **Preview before you build**: see every page in the terminal, and how full it is.
- 🌍 **Several CVs**: one per language or per person, side by side.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/terminal-dark.svg"><img src="brand/icons/terminal.svg" width="24" height="24" alt=""></picture> Quickstart

```bash
# The command and the agent skill; run it again to update both
curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh

# The same with the PDF, without Google Docs: also installs LibreOffice
curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh -s -- --pdf

# The command and the skill separately
curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh -s -- --no-skill
npx skills add honeyglass/oriko --skill oriko -g -y

# By hand, from a clone
git clone https://github.com/honeyglass/oriko.git
cd oriko
pnpm install --frozen-lockfile
node bin/oriko.ts schema
```

The script installs the command `oriko` and then the agent skill, for Claude Code and every other
agent it finds. For the skill it runs the [skills CLI](https://www.skills.sh/) behind skills.sh.

oriko always writes the Word file for Google Docs. With [LibreOffice](https://www.libreoffice.org)
it writes the PDF too, the page Google Docs would make: `oriko build --out cv.pdf`. `--pdf`
installs LibreOffice with brew, apt or dnf; without it, the script names the command to run.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/star-dark.svg"><img src="brand/icons/star.svg" width="24" height="24" alt=""></picture> The recommended way

Give the agent three things at once, then answer its questions:

- **Your old CV**: a PDF, a Word file, your oriko CV, or your profile from LinkedIn or another
  job portal, saved as PDF.
- **Notes in your own words**: what you did, how you work, what the old CV leaves out. Short
  lines are enough, in any language.
- **The job posting**: a file or a link.

```text
# All three at once
Create a CV for this job. My CV: ~/cv.pdf. My notes: ~/notes.txt. The posting: ~/job.pdf

# Your LinkedIn profile, saved as PDF, stands in for the old CV
Create a CV for this job. My CV: ~/Downloads/Profile.pdf. The posting: https://…

# Notes from Claude or ChatGPT: if you have worked with one for a while, ask it first …
Write a profile of me for my CV: what I work on, what I am good at, what I like to do,
with years and tools where you know them. Mark what you are not sure of.
# … save the answer, and hand it over as your notes
Create a CV for this job. My CV: ~/cv.pdf. My notes: ~/about-me.md. The posting: ~/job.pdf

# Or all of it at once: each file adds what the others leave out
Create a CV for this job. My CV: ~/cv.pdf and ~/Downloads/Profile.pdf.
My notes: ~/notes.txt and ~/about-me.md. The posting: ~/job.pdf

# Shorter requests work too
Fit my CV to this job: <paste the job posting>
Create a new CV for me. Since 03/2021 I have worked as a data engineer at …
```

The agent reads all three, asks in short rounds before a fact from your notes goes into your CV,
and builds a version for the posting. You read the preview and say what to change in plain
words ("shorter", "leave out Figma", "Built instead of Delivered"); the agent changes it and
shows the preview again. At the end you get the Word file, or the PDF.

This works well because each part does one job: your notes bring the facts the old CV misses,
the posting says what matters, and oriko checks every step, so nothing is invented.

What the agent does for a posting, step by step:
[Good to know](docs/good-to-know.md#-what-the-agent-does-for-a-job-posting). No CV yet? See
[Good to know](docs/good-to-know.md#-no-cv-yet).

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/monitor-dark.svg"><img src="brand/icons/monitor.svg" width="24" height="24" alt=""></picture> Terminal preview

**See your CV before the file exists.** `oriko preview` draws every page in the terminal, the left
column beside the right one, as in the finished document:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/showcase/go-e-senior-backend/terminal-excerpt-dark.png">
  <img src="examples/showcase/go-e-senior-backend/terminal-excerpt.png" width="100%" alt="The top of page 1 of Jane Doe's CV as the terminal preview draws it">
</picture>

<details>
<summary><b>The same preview as text</b></summary>

```text
╭─ Page 1 of 3 ────────────────────────────────────────┬───────────────────────────╮
│                                                      │                           │
│   ╭───────┐                                     Jane │ CONTACT ───────────────── │
│   │       └┐                                     Doe │                           │
│   │ ●   ●  │                 Senior Backend Engineer │ Germany, Berlin           │
│   │•  ◡   •│                                         │ Example Street 1          │
│   │ ── ─── │                                         │ 10115 Berlin              │
│   ╰────────╯                                         │ +49 (0) 30 000 000        │
│                                                      │ jane.doe@example.com      │
│                                                      │ Profile »                 │
│                                                      │                           │
│ PROFESSIONAL EXPERIENCE ──────────────────────────── │ SKILLS ────────────────── │
│                                                      │                           │
│ ● Senior Backend Engineer            03/2021 – today │ Programming Languages     │
│ │                                                    │   Go                ●●●●● │
│ │ Northwind Logistics GmbH · Berlin (DE)             │   TypeScript        ●●●●○ │
│ │ › Rebuilt the shipment tracking service in Go      │   SQL               ●●●●○ │
│ │   for ten times the load, at 40,000 events per     │   Java              ●●●○○ │
│ │   second                                           │   Rust              ●●○○○ │
├──────────────────────────────────────────────────────┴───────────────────────────┤
│ Left  ■■■■■■■■□□ 84 % full     Right ■■■■■■■■■■ 97 % full                        │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

</details>

```sh
oriko preview --profile go-e-senior-backend   # the version for one job posting
oriko preview --cv jane-doe                   # your CV as it stands
```

**Send the preview as a CV.** `build --style terminal` writes the sheets as a Word file, one A4
page each, set in Fira Code so Google Docs keeps every character in its column. Send the classic
file to managers and the terminal file to developers:

```sh
oriko build --profile go-e-senior-backend --style terminal --out go-e-terminal.docx
```

What each mark of the preview means: [the terminal preview page](docs/terminal-preview.md).

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/folder-lock-dark.svg"><img src="brand/icons/folder-lock.svg" width="24" height="24" alt=""></picture> Your data

Your CVs live outside the repository, in `~/.oriko`; `--home <folder>`, or the variable
`ORIKO_HOME`, points oriko at another one.

```text
~/.oriko/
  cvs/jane-doe.json           your CV: language, person, contact, pages, blocks
  cvs/jane-doe.png            its photo
  profiles/backend-job.json   one version per job posting, naming its CV in "cv"
```

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/plug-dark.svg"><img src="brand/icons/plug.svg" width="24" height="24" alt=""></picture> Compatibility

The layout is tuned to Google Docs; Word and LibreOffice break lines differently, so a block may
spill over to the next page there. The PDF without Google Docs, the terminal style, Node, the
install script and the agents oriko works with: [Compatibility](docs/compatibility.md).

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/puzzle-dark.svg"><img src="brand/icons/puzzle.svg" width="24" height="24" alt=""></picture> Principles

- 🧩 **[Agentic meets deterministic](https://github.com/honeyglass/skills/blob/main/adx/cli/README.md#agentic-meets-deterministic)**: the agent judges, the CLI
  checks every step, and the skill fixes the order.
- 🛡️ **[Safe dependencies](SECURITY.md)**: packages only from an allow list, at least three days
  old, and none may run programs while it installs.

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/book-open-dark.svg"><img src="brand/icons/book-open.svg" width="24" height="24" alt=""></picture> Docs

- [**Examples**](docs/examples.md)
- [**By hand**](docs/by-hand.md)
- [**Sample data**](docs/sample-data.md)
- [**CLI**](docs/cli.md)
- [**Terminal preview**](docs/terminal-preview.md)
- [**Compatibility**](docs/compatibility.md)
- [**Good to know**](docs/good-to-know.md)
- [**Security**](SECURITY.md)
- [**Agent skill**](.claude/skills/oriko/SKILL.md)

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/map-dark.svg"><img src="brand/icons/map.svg" width="24" height="24" alt=""></picture> Roadmap

- [ ] More CV templates
- [ ] An [ATS check](https://enhancv.com/resources/resume-checker/) of the classic CV after every build
- [ ] The skill for Codex
- [ ] The skill for Gemini CLI
- [ ] A cover letter per job posting, from the same facts as the CV
- [ ] A one-line installer for Windows
- [ ] A new CV from a LinkedIn export or a JSON Resume file
- [ ] Publish on npm as `oriko`
- [ ] The [folder README tool](tools/readmes/README.md) in `@honeyglass/utils`, for every honeyglass repository

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/wrench-dark.svg"><img src="brand/icons/wrench.svg" width="24" height="24" alt=""></picture> Development

How to set up oriko, how its code is laid out, its checks, and how to send a change:
[Contributing](CONTRIBUTING.md). Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## <picture><source media="(prefers-color-scheme: dark)" srcset="brand/icons/scale-dark.svg"><img src="brand/icons/scale.svg" width="24" height="24" alt=""></picture> License

Copyright (C) 2026 Serkan Sipahi. oriko is free software under the
[GNU Affero General Public License v3.0](LICENSE): you may use, change and share it. Anyone who
shares a changed version, or offers one as a service over a network, must publish its source
under the same license.

The name oriko and the Oriko character are not covered by this license. That includes the
files in [`brand/`](brand/) and the Oriko drawing the preview shows; all rights to them stay
with the author. A changed version of oriko needs another name and logo.
