# Contributing to MIDI Guide

Thank you for helping MIDI Guide to document every MIDI note parameter! This contribution guide explains how to submit new or edited device trigger definitions.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

By contributing, you agree that your contributions will be licensed under the [CC BY-SA 4.0](LICENSE) license.

# Documenting note triggers

Some devices — drum machines, sample players, and other percussion instruments — produce sounds in response to MIDI **note** messages rather than (or in addition to) Control Change and NRPN messages. The main MIDI Guide CSV format can't express this: it describes continuous controllers, not note triggers. So note triggers live in a separate, sibling file.

## When to create a triggers file

Only create one when a device has sounds that are fired by MIDI notes. A device can have both a regular CSV (its CCs and NRPNs) and a triggers CSV (its note-triggered sounds); the two are independent and never overlap.

## File naming and placement

A triggers file sits **beside** the device's regular CSV, sharing the same stem:

```
Vermona/DRM1 MKIV.csv            ← CCs and NRPNs (if any)
Vermona/DRM1 MKIV.triggers.csv   ← note triggers
```

The manufacturer folder and device name follow exactly the same rules as the main format (nicely capitalised, spaces not hyphens, no manufacturer name in the filename). The only addition is the `.triggers` qualifier before `.csv`.

## Column reference

Every triggers CSV has exactly these 11 columns, in this order:

| Column | Required | Description | Example |
|---|---|---|---|
| `manufacturer` | **Yes** | Manufacturer name. Must match folder | `Vermona` |
| `device` | **Yes** | Device name. Must match filename (the part before `.triggers.csv`) | `DRM1 MKIV` |
| `section` | No | Logical grouping — by addressing mode, instrument, or kit | `808 Drum sounds` |
| `sound_name` | **Yes** | The triggered voice, brief label | `TR808 Bass drum` |
| `sound_description` | No | Extra detail about the sound or its behaviour. Sentence-cased. No line breaks | `Plays the active track across its 48 chromatic variations.` |
| `midi_channel` | **Yes** | The channel the trigger is received on. A literal `1`, `2`, ... `16`, or `basic`, `omni`, `auto` (see below) | `basic` |
| `note_number_min_value` | **Yes** | Lowest MIDI note (0-127) that triggers the sound | `36` |
| `note_number_max_value` | **Yes** | Highest MIDI note (0-127) that triggers the sound | `36` |
| `note_number_default_value` | No | The natural / representative note within the range. Blank if the range has no natural pitch | `36` |
| `comments` | No | Caveats, constraints, gotchas. Sentence-cased. No line breaks | `Factory default channel; reconfigurable.` |
| `velocity_usage` | No | How Note On velocity behaves, using the Usage range grammar. Ranges usually start at 1 | `1~127: Volume` |

### `sound_name` and `sound_description`

`sound_name` names the voice (`Kick`, `Snare`, `TR909 Open hihat`).

When a row doesn't map to one fixed voice — for example a row that plays "whichever track is currently active" — name it for what it is (`Chromatic`, `Active track`) and explain it in `sound_description`.

### `midi_channel`

This required field takes one of the following values. Prefer a literal number whenever a specific channel is documented; the keywords are for cases a number can't express.

| Value | Meaning | Use when |
|---|---|---|
| `1`-`16` | A specific channel | The channel is documented — either a per-row mapping (e.g. each track on its own channel), or a device's single documented/factory-default receive channel |
| `basic` | The device's single assigned receive channel (the MIDI Implementation Chart's "Basic Channel"; user-configurable) | All sounds share one user-set channel and **no default is documented** to record as a literal |
| `omni` | The device responds on all channels; channel is ignored | The device is in (or fixed to) Omni mode |
| `auto` | The channel that routes to the currently active / selected track | Triggering follows whichever track the user has selected, rather than a fixed channel |

Note the split between a literal and `basic`: Vermona's DRM1 MKIV documents a factory-default channel (10), so its rows use `10`. The Novation DrumStation receives on a single user-set channel with no documented default, so its rows use `basic`.

### Note number columns

The three note-number columns describe which note(s) trigger the sound.

- **A single fixed note:** set all three columns to that note. `Kick` on note 36 → `36`, `36`, `36`.
- **A chromatic range with a natural pitch:** set `min` and `max` to the range, and `default` to the un-transposed/natural note. A voice playable across notes 0-31 that sounds un-transposed at 15 → `0`, `31`, `15`.
- **A range with no natural pitch** (slice playback, or a row that plays the active track): set `min` and `max`, and **leave `default` blank**. The Analog Rytm's chromatic row → `12`, `59`, ``.

`note_number_min_value` and `note_number_max_value` are always populated; `note_number_default_value` may be blank when no single note is representative.

### `velocity_usage`

How the device responds to Note On velocity, written with the **same range grammar as the `usage` column** (see the Usage section of the main format): `~` for continuously-varying ranges, `-` for stepped ranges where every value behaves the same, `:` and `;` as delimiters.

- Continuous level: `1~127: Volume` or `1~127: Accent level`
- A stepped special value: `1~126: Accent; 127: Gate`
- Leave **blank** when the device ignores velocity, or its velocity behaviour isn't documented.

**Velocity ranges typically start at 1, not 0.** Under the MIDI 1.0 convention, a Note On with velocity 0 is treated as a Note Off, so 0 isn't a usable trigger velocity on most gear.

### `comments`

Caveats, constraints, and gotchas that a sender needs to know but that aren't a field of the message — e.g. `Track Sound must be chromatic-enabled (Sound Settings) for this to be effective`, or `Factory default channel; reconfigurable`. Sentence-cased, no line breaks.

## Sections and multiple addressing schemes

Use `section` to keep things navigable, following the main format's section conventions.

Many devices expose **more than one way to trigger the same sounds** — for instance a "single-channel" mode (every voice on one channel, distinguished by note) and a "per-instrument" mode (each voice on its own channel). Document each scheme as its own group of rows under a descriptive `section`. The same sound legitimately appears more than once, with different `midi_channel` and note values — that's expected, not a duplication error.

## Gotchas

### It's okay to duplicate sounds

A sound may be reachable on several notes, on several channels, or through several modes. Give each its own row. Note numbers, channels, and sound names do not need to be unique across rows.

### A blank `note_number_default_value` is normal

For slices and active-track rows there is no single natural note. Blank is the correct, expected value — not a gap to be filled.

## Worked examples

**A fixed single-channel kit** (Vermona DRM1 MKIV) — every voice on the device's documented channel 10, one note each:

| `manufacturer` | `device` | `section` | `sound_name` | `sound_description` | `midi_channel` | `note_number_min_value` | `note_number_max_value` | `note_number_default_value` | `comments` | `velocity_usage`
|---|---|---|---|---|---|---|---|---|---|---|
| Vermona | DRM1 MKIV | General | Kick | | 10 | 36 | 36 | 36 | | 1~127: Accent level |
| Vermona | DRM1 MKIV | General | Snare | | 10 | 38 | 38 | 38 | | 1~127: Accent level |
| Vermona | DRM1 MKIV | General | Clap | | 10 | 39 | 39 | 39 | | 1~127: Accent level |

**Two addressing schemes** (Roland TR-1000) — a single-channel mode on `basic`, plus a per-instrument mode where each voice has its own channel and a shared note layout:

| `manufacturer` | `device` | `section` | `sound_name` | `sound_description` | `midi_channel` | `note_number_min_value` | `note_number_max_value` | `note_number_default_value` | `comments` | `velocity_usage`
|---|---|---|---|---|---|---|---|---|---|---|
| Roland | TR-1000 | Single channel mode | BD | | basic | 36 | 36 | 36 | | 1~127: Volume |
| Roland | TR-1000 | Single channel mode | SD | | basic | 38 | 38 | 38 | | 1~127: Volume |
| Roland | TR-1000 | BD | BD | | 1 | 40 | 40 | 40 | | 1~127: Volume |
| Roland | TR-1000 | BD | BD Layer A slice | | 1 | 0 | 15 | | | 1~127: Volume |

**Per-track triggers plus an active-track chromatic row** (Elektron Analog Rytm MKII) — twelve fixed per-track rows (note selects the track, on that track's own channel), and one `auto` row that plays whichever track is active across a chromatic range with no natural note:

| `manufacturer` | `device` | `section` | `sound_name` | `sound_description` | `midi_channel` | `note_number_min_value` | `note_number_max_value` | `note_number_default_value` | `comments` | `velocity_usage`
|---|---|---|---|---|---|---|---|---|---|---|
| Elektron | Analog Rytm MKII | General | Sound track 1 | | 1 | 0 | 0 | 0 | | |
| Elektron | Analog Rytm MKII | General | Sound track 1 | | 1 | 0 | 0 | 0 | | |
| Elektron | Analog Rytm MKII | General | Sound track 2 | | 2 | 1 | 1 | 1 | | |
| Elektron | Analog Rytm MKII | General | Chromatic | "Plays the currently active track's sound across its 48 chromatic variations, lowest to highest pitch." | auto | 12 | 59 |  | Track Sound must be chromatic-enabled (Sound Settings) for this to be effective | |