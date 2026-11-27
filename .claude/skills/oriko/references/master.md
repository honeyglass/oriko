# Writing a master

Part of state 8 Write in `../SKILL.md`: read this file before the first command of the state.

**Every change to a master goes through an oriko command; each one checks its input and answers the issues.**

## Commands

| Command                       | Input with '--json'                                                                                          |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------- |
| 'oriko init --cv NAME'        | '{"language":"de","firstName":"…","lastName":"…","role":"…"}'                                                |
| 'oriko cv update --cv NAME'   | '{"language","pages","person":{"firstName","lastName","role"},"contact":{"title"}}', each optional           |
| 'oriko contact add --cv NAME' | '{"value":{"icon":"mail","lines":["…"]}}'; icons: pin, home, phone, mail, globe; 'link' optional, https only |
| 'oriko block add --cv NAME'   | '{"block":{…},"after":"ID"}'; 'oriko schema block' gives the fields per kind                                 |
| 'oriko item add --cv NAME'    | '{"block":"ID","value":…}' adds a bullet, a skill or an entry to a block                                     |

- `init` writes an empty master with a placeholder photo, two pages and the contact title 'Contact'.
- Set the contact title in the master's language with `cv update`, such as 'Kontakt' for German.
- Pass the JSON with `--json '…'`; `--json` takes the JSON text, not a file name.
  Through stdin, `init` reads the JSON alone; the other commands above need `--json -`.
- An edit that leaves the master as it is writes nothing and answers `"unchanged": true`.
- Add jobs from the newest to the oldest, each after the one before, so the time order holds.
- A refused command writes nothing; fix it by 'Fixing a refusal' in `../SKILL.md` and call it again.

## A job block

```json
{
  "block": {
    "id": "datenwerk",
    "kind": "job",
    "section": "Berufserfahrung",
    "from": "03/2021",
    "to": "heute",
    "title": "Data Engineer",
    "place": "Leipzig (DE)",
    "employer": "Datenwerk GmbH",
    "bullets": ["Datenpipelines von Batch-Jobs auf Streaming mit Kafka und Flink umgestellt"]
  }
}
```

Every block of one section uses the same `section` text; a section title stands in the master's language.

## Levels from words

**A level comes only from a word the user used; report each one you derived.**

| The user's word                                | Level |
| :--------------------------------------------- | :---- |
| native, Muttersprache, expert, Experte         | 5     |
| very good, sehr gut, fluent, fließend          | 4     |
| good, gut                                      | 3     |
| basic, Grundkenntnisse, a little, ein bisschen | 2     |

A skill the user named without one of these words goes into a `list` block, never into a `rated` one.

Then return to state 8 Write in `../SKILL.md`.
