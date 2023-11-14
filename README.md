# MIDI CC & NRPN database

This is the MIDI CC and NRPN database maintained by User Camp. We want to document the MIDI implementation of every synthesizer. 

You might like to [visit the project's website at https://midi.guide](https://midi.guide/) to browse this data more conveniently.

As well as the website, this database powers Condukt's built-in device definitions. Condukt is a performance MIDI controller for iPad. You can [sign up for Condukt's development newsletter](https://user.camp/apps/condukt/), or [follow us on Twitter](https://twitter.com/goodcondukt).

The portions of this database that refer to specific devices may be owned by the devices' respective manufacturers. For everything else, see LICENSE.

## Contributing

We welcome and value contributions from the community. You can open issues here on GitHub, or send us pull requests. Alternatively, download and alter any CSV you like, and email it to [midi@midi.guide](mailto:midi@midi.guide) and we'll publish your changes for you.

If you want to add a new device, download `template.csv` to get started. You can edit this file with a spreadsheet program (like Excel) or a text editor. 

[👉 Get template.csv 👈](https://raw.githubusercontent.com/usercamp/midi/main/template.csv)

Each CSV should contain our best effort to document that device's entire list of MIDI CCs (and NRPNs). If there's any vagueness in your definitions, you can add explanations in the Notes column. Once your CSV is merged into this repository, your device will appear on the MIDI database's website with our thanks!

### File names and structure

 - Each manufacturer gets its own folder. It should be capitalized nicely and use spaces, like `Teenage Engineering` (not like `teenage-engineering`).
 - Each device gets its own CSV file inside its manufacturer's folder. It should likewise be capitalized nicely and use spaces, and not include the manufacturer's name, like `Analog Four Mk II.csv` (not like `analog-four.csv` and not like `Elektron Analog Four.csv`)

### Orientation column

- Orientation should be either `0-based` or `centered`

### Usage column

 - For CCs that have continous meaningful values (ie, CCs you'd probably use a fader or rotary encoder for), ranges should be defined like this: `0~127: Morph amount`. The `~` (tilde) means that every value in the range produces a different result.
 - For CCs that don't have continuous meaningful values (ie, CCs you'd probably use a switch for), ranges should be defined like this: `0-63: Off; 64-127: On`. The `-` (dash) means that values within the range produce equivalent results.
 - Usage definitions can be mixed, like this: `0: Square; 1: Sawtooth; 2~63: Morph; 64-127: Off`
- Colons `:` and semi-colons `;` are reserved for delimiting values and should not be otherwise used.
