# Contributing to the MIDI CC & NRPN Database

Thank you for helping MIDI Guide to document every MIDI CC parameter! This contribution guide explains how to submit new or edited device definitions.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

By contributing, you agree that your contributions will be licensed under the [CC BY-SA 4.0](LICENSE) license.

## Quick Start

If you just want to get started, or are documenting a straightforward instrument, this section will be enough for you.

### Adding a new instrument

1. For an instrument not yet in the dataset, download [`template.csv`](https://raw.githubusercontent.com/pencilresearch/midi/main/template.csv)
2. Fill it in using the MIDI implementation chart from your device's manual, and submit it to us (see below).

### Patching an existing instrument

1. For an instrument already in the dataset, download its current CSV from the [MIDI Guide project website](https://midi.guide) or from GitHub
2. Make your changes to the file you downloaded, and submit it to us (see below).

### Documenting the instrument

The file should be named and placed as follows:

 - Each manufacturer gets its own folder. It should be capitalized nicely and use spaces, like `Teenage Engineering` (not like `teenage-engineering`).
 - Each device gets its own CSV file inside its manufacturer's folder. It should likewise be capitalized nicely and use spaces, and not include the manufacturer's name, like `Analog Four Mk II.csv` (not like `analog-four.csv` and not like `Elektron Analog Four.csv`)

Most columns are optional or flexible. These ones are strict:

**Orientation** should be either `0-based` or `centered`

**Usage** needs to adhere to this format:

 - For CCs that have continous meaningful values (ie, CCs you'd probably use a fader or rotary encoder for), ranges should be defined like this: `0~127: Morph amount`. The `~` (tilde) means that every value in the range produces a different result.
 - For CCs that don't have continuous meaningful values (ie, CCs you'd probably use a switch for), ranges should be defined like this: `0-63: Off; 64-127: On`. The `-` (dash) means that values within the range produce equivalent results.
 - Usage definitions can be mixed, like this: `0: Square; 1: Sawtooth; 2~63: Morph; 64-127: Off`
 - Colons `:` and semi-colons `;` are reserved for delimiting usage values and should not be otherwise used.

### Submitting your contribution

*GitHub*: You can submit via pull request on GitHub:

1. Fork the repository
2. Add your CSV to `<Manufacturer>/<Device>.csv`
3. Open a pull request

*Email*: We're just as happy to receive your submission by email. Send your CSV to [midi@midi.guide](mailto:midi@midi.guide) and we'll publish it for you.

# This dataset's file structure

These are the guidelines we use to keep the entire dataset human-navigable and organized.

## Folder names

Each manufacturer gets its own folder, e.g. `Teenage Engineering/`, `Dave Smith Instruments/`.

The folder name should precisely match the name of the manufacturer (so not `teenage-engineering/` or `DSI/`).

## Filenames

Each device gets one CSV inside its manufacturer folder, e.g. `Analog Four Mk II.csv`.

The filename should precisely match the name of the device (so not `analog-four.csv` or `Analog Four Mk 2.csv`).

Do not include the manufacturer name in the filename (so not `Elektron Analog Four.csv`).

# The MIDI Guide CSV Format

MIDI Guide's CSV format is designed to be easy to use for humans AND programs. There are very few required fields. Remember that a small contribution is better than no contribution. 

If you're not sure about something, just leave a note there or leave it blank. Don't worry: your file will get fleshed out or clarified by maintainers during the review process.

## Column Reference

Every CSV must have exactly these 18 columns, in this order:

| Column | Required | Description | Example |
|---|---|---|---|
| `manufacturer` | **Yes** | Manufacturer name. Must match folder name | `Moog` |
| `device` | **Yes** | Device name. Must match filename | `Subsequent 37` |
| `section` | No | Logical grouping of parameters |`Oscillators`, or `Filter`, or `LFO 1` |
| `parameter_name` | **Yes** | Brief label, sentence-cased | `Filter 1 envelope` |
| `parameter_description` | No | Details about the parameter can be added here. Sentence-cased. Do not use line breaks. (Caveats, warnings, etc. go in `notes`.) | _Controls either the Time Subdivision or Global Tempo._ |
| `cc_msb` | If applicable | CC number, 0-127 | `1`|
| `cc_lsb` | If applicable | LSB for 14-bit CC pairs, 0-127 | `33` |
| `cc_min_value` | No | Minimum CC value | `0` |
| `cc_max_value` | No | Maximum CC value | `127` |
| `cc_default_value` | No | Default CC value | `64` |
| `nrpn_msb` | If applicable | NRPN MSB number | `0` |
| `nrpn_lsb` | If applicable | NRPN LSB number | `8` |
| `nrpn_min_value` | No | Minimum NRPN value | `0` |
| `nrpn_max_value` | No | Maximum NRPN value | `16383` |
| `nrpn_default_value` | No | Default NRPN value | `0` |
| `orientation` | **Yes** | Must be either `0-based` (unipolar) or `centered` (bipolar). If unsure, use `0-based`. | `0-based` |
| `notes` | No | Caveats, gotchas, channel constraints. Sentence-cased. Do not use line breaks. | _CC 33 (LSB) should always be sent as 0._ |
| `usage` | No | Value mappings (see usage syntax below) | `0-63: Off; 64-127: On` |

### Sections

Grouping parameters and behaviour into sections helps keep the documentation readable.

#### Naming sections

Section names should be complete, but short:

| Good section name | Bad section name |
| --- | --- |
| `Oscillator` | `Oscillator settings` |
| `Filter` | `FILT` |
| `Arpeggiator` | `Arp params` |

#### Organizing similar parameters

If a device has more than one of a feature (e.g. two oscillators, or three LFOs), decide whether there should be a single section for that feature type, or a section per instance of that feature. 

For example, consider a synth with three LFOs, with each LFO having many parameters: speed, shape, sync, destination, trigger, etc. Its parameters should be organized per-LFO, as follows:

| Section | Parameter |
| --- | --- |
| LFO 1 | Speed |
| LFO 1 | Shape |
| LFO 1 | ... |
| LFO 2 | Speed |
| LFO 2 | Shape |
| LFO 2 | ... |
| LFO 3 | Speed |
| LFO 3 | Shape |
| LFO 3 | ... |

Consider a synth with three LFOs, each only having two parameters: speed and shape. Its parameters should be organized in one big LFO group, as follows:

| Section | Parameter |
| --- | --- |
| LFOs | LFO 1 speed |
| LFOs | LFO 1 shape |
| LFOs | LFO 2 speed |
| LFOs | LFO 2 shape |
| LFOs | LFO 3 speed |
| LFOs | LFO 3 shape |

#### Organizing parameters for a multi-track device

For multi-track or multi-mode devices, it’s okay to use a colon in the section name to keep things tidy. 

Consider a synth with two tracks, and each track has its own two LFOs. Its parameters should be organized as follows:

| Section | Parameter |
| --- | --- |
| Track 1: LFOs | LFO 1 speed |
| Track 1: LFOs | LFO 1 shape |
| Track 1: LFOs | LFO 2 speed |
| Track 1: LFOs | LFO 2 shape |
| Track 2: LFOs | LFO 1 speed |
| Track 2: LFOs | LFO 1 shape |
| Track 2: LFOs | LFO 2 speed |
| Track 2: LFOs | LFO 2 shape |

### Parameter name

A short, but unabbreviated, label is best here. Don't all-caps a label unless it's an initialism (so `LFO` is fine, but `OSC` is not).

### Parameter description

This is usually unnecessary, given a good parameter name. But sometimes the parameter bears further description than a short title; it goes here. (Caveats and warnings should be saved for the Notes column.)

### CC columns

The format has 5 columns for documenting CC messages. These columns denote the MSB and LSB of the message, the range of its acceptable values, and the default value. 

It's most common for a parameter to use a `cc_msb` and no `cc_lsb`. In that case, leave `cc_lsb` empty. 

A parameter might not use CC at all, in which case these should all be left empty.

### NRPN columns

Some devices that want to offer more control will listen for NRPN messages. NRPN messages have more resolution than CC messages.

Sometimes, a synth will accept both CC messages and NRPN messages to control the same parameter. 

If that's the case, check if `[cc_min_value-cc_max_value]` equals `[nrpn_min_value-nrpn_max_value]`. If it does, you can put the CC and NRPN details all on one row. If it doesn't, use two rows. 

### Orientation

Orientation represents the polarity of the parameter. Consider a keyboard MIDI controller: usually, they have a pitch wheel and a mod wheel. The pitch wheel rests in the middle, where it does nothing; the mod wheel rests at the bottom, where it does nothing. The pitch wheel, then, is `centered`, and the mod wheel is `0-based`. 

`0-based` is much more common and should be considered the default.

- **`0-based`** (default) – use this unless the parameter is clearly bipolar
- **`centered`** – for bipolar parameters where a midpoint is neutral: pan, detune, pitch bend, balance

### Notes

Caveats and exceptions go here, like these: 

- _Only responds on channel 10_
- _Typo in manual (says CC 66; 65 is correct)_
- _Reserved_

It's common for many parameters to have the same note (like _Only responds on channel 10_). That's okay.

### Usage

This column documents the behaviour of each CC/NRPN message by listing ranges of its possible values, and the instrument’s resulting behaviour for those ranges. It has strict formatting rules to keep meaning consistent across the dataset.

#### Sample usages

Here are some sample, made-up parameter names and usage fields. All ranges are inclusive. 

| Parameter name | Usage | Meaning |
|--|--|--|
| Effects | `0-63: Off; 64-127: On`| • Any value between 0 and 63 will turn off the effects. <br/> • Any value between 64 and 127 will turn on the effects. |
| Pan | `0~63: Pan left; 64: Center; 65~127: Pan right` | • Values between 0 and 63 will set pan to the left by a certain amount<br/> • A value of 64 exactly will set pan to center<br/> • Values between 64 and 127 will set pan to the right by a certain amount |
| Wave shape | `0: Off; 1-10: Square; 11-20: Saw; 21~127: Morph` | • A value of exactly 0 will turn off the wave generator.</br> • Any value between 1 and 10 will set the wave shape to Square.<br/> • Any value between 11 and 20 will set the wave value to Saw.<br> • Values between 21 and 127 will set the wave to Morph, with different results at each value (note the tilde `~` in `21~127`). |

#### Defining ranges

As you might have noticed, ranges of values can be defined in three ways:

 - By a single number, like `0: All notes off`. Think of an elevator button.
 - By a dash, like `0-63: Off`. The dash `-` means that every value in the range does the same thing. Think of an on/off switch.
 - By a tilde, like `0~127: Filter cutoff`. The tilde `~` means that every value in the range does something different. Think of a gas pedal.

A usage value can contain different types of ranges, like the "Wave shape" example above.

 - Numbers in a range must **always** be equal to or greater than zero.
 - Numbers in a range must **always** be equal to or greater than `cc_min_value`.
 - Numbers in a range must **always** be equal to or less than `cc_max_value`.

#### Putting multiple ranges in a usage value

Usage values almost always contain more than range - that's what makes them interesting. They're kept tidy with colons `:` and semicolons `;`. Because of this, colons and semicolons in a usage value are reserved; you're not allowed to use them for anything else. 

 - A range definition, like `0-63`, and its related behaviour, like `Off`, are separated by a colon, `: `, like `0-63: Off`.
 - When a usage field needs more than one range defined (almost always), separate them with a semicolon `;`, like `0-63: Off; 64-127: On`

## Gotchas, caveats

### It's okay to duplicate CCs/NRPNs

If the same CC controls different things in different modes, create **separate rows** – one per behaviour. CCs and NRPNs do not need to be unique across rows.

For instance, if CC24 controls filter cutoff when your synth is in Mode 1, and FM operator 2 when your synth is in Mode 2, you would create two complete rows for CC24, each with their own section, usage, etc.

### Logical vs. actual values

Usually, the body of a synth's manual will use logical values, rather than actual values, for parameters. 

Consider a Coarse Pitch knob on a synth. It can change the pitch to one of 7 discrete values between -3 semitones and +4 semitones, with a default value of 0.

This parameter's usage should **not** be documented as `-3~4: Coarse pitch`, and its default is not `0`. 

Here's a possible usage value for this parameter:

`0-15: -3st; 16-31: -2st; 32-47: -1st; 48-63: 0; 64-79: +1st; 80-95: +2st; 96-107: +3st; 108-127: +4st` (default: 64)

Here's another one: 

`61: -3st; 62: -2st; 63: -1st; 64: 0; 65: +1st; 66: +2st; 67: +3st; 68: +4st` (default: 64)

Which is correct? Well, if it doesn't say in the MIDI implementation reference in the manual, and you're not willing to poke at the synth to reverse engineer it, you can't tell. The manual's logical values don't give you enough to go on, and you should leave the `usage` column empty.

### Instruments with mappable MIDI CC (MIDI Learn)

Some instruments, instead of offering predefined MIDI CC mappings, allow the user to assign MIDI CC numbers to the synth's parameters. This might be true for the entire range of CC messages, or only a subset.

The correct approach to documenting these synthesizers is to provide a row for each mappable MIDI CC number. This is true even if all 128 MIDI CC numbers are mappable. For example, if the made-up synthesizer "SynthCo Orca" allows the user to assign MIDI CCs 51 to 55 to arbitrary parameters, those MIDI CC numbers should be documented as follows:

| manufacturer | device | section | parameter_name | cc_msb | \[...\] |
| --- | --- | --- | --- | --- | --- |
| SynthCo | Orca | Assignable parameters | Parameter 51 | 51 | \[...\] |
| SynthCo | Orca | Assignable parameters | Parameter 52 | 52 | \[...\] |
| SynthCo | Orca | Assignable parameters | Parameter 53 | 53 | \[...\] |
| SynthCo | Orca | Assignable parameters | Parameter 54 | 54 | \[...\] |
| SynthCo | Orca | Assignable parameters | Parameter 55 | 55 | \[...\] |

