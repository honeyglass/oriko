# The profile format

Part of state 3 Draft in `../SKILL.md`: read this file before the first draft of a profile.

**A profile is a JSON file that names its master in `cv`; its other fields change that master for one posting only.**

Store it with `oriko profile set --profile NAME --json '<profile>'`; `oriko schema profile` answers the accepted shape.
The command runs the checks of `oriko plan` and stores nothing it refuses; fix a refusal by 'Fixing a refusal' in `../SKILL.md`.

```json
{
  "cv": "jane-doe",
  "person": { "role": "Senior Frontend Engineer" },
  "order": ["expertise", "programming-languages"],
  "blocks": {
    "freelancer": { "hidden": true },
    "additional-skills": { "items": ["REST", "Websockets", "Gitlab CI/CD"] },
    "avodaq": { "bullets": ["Delivered an IoT real-time platform", "Role: Engineer, Architect"] }
  }
}
```

## cv

**`cv` names the master in `cvs/` the profile changes.**

- Write it in every profile, so the profile still builds when a second master is added.
- `oriko cvs` lists the names.

## person

**`person.role` replaces the line under the name.**

- Change the role only to the posting's wording for the same role and level.
- `person.photo` is set by `oriko photo set --file <file> --profile NAME`, never by hand.
- Set another photo only when the user asks for one; it replaces a stored photo only with `--replace`.

## order

**`order` lists block ids that come first, in this order; the other blocks follow as in the master.**

- The order matters only inside a column, since the kind of a block decides its column.
- Leave the jobs out of `order`, so they stay newest first.

## blocks

**`blocks.<id>` replaces the named fields of that block; every other field stays as in the master.**

| Field value                     | Effect                                              |
| :------------------------------ | :-------------------------------------------------- |
| '"hidden": true'                | hides the block                                     |
| '"hidden": false'               | shows a block the master hides                      |
| a list for 'bullets' or 'items' | replaces the whole list, so write the full new list |
| 'null'                          | removes an optional field, such as 'page'           |

- The id and the kind of a block never change.
- `oriko schema block` gives the fields of each kind.
- Leave out every block and field that stays as in the master, so a later change to the master still reaches the profile.

Then return to state 3 Draft in `../SKILL.md`.
