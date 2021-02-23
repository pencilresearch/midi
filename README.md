# MIDI CC & NRPN database

This is the MIDI CC and NRPN database maintained by User Camp. We want to document the MIDI implementation of every synthesizer. 

You might like to [visit the project's website](https://midi.user.camp) to browse this data more conveniently.

As well as the website, this database powers Condukt's built-in device definitions. Condukt is a performance MIDI controller for iPad. You can [sign up for Condukt's development newsletter](https://user.camp/apps/condukt/), or [follow us on Twitter](https://twitter.com/goodcondukt).

The portions of this database that refer to specific devices may be owned by the devices' respective manufacturers. For everything else, see LICENSE.

## Contributing

We welcome and value contributions from the community. You can open issues here on GitHub, or send us pull requests. Alternatively, download and alter any CSV you like, and email it to [midi@user.camp](mailto:midi@user.camp) and we'll publish your changes for you.

If you want to add a new device, download `template.csv` to get started. You can edit this file with a spreadsheet program (like Excel) or a text editor.

Here's how the project is structured:

 - Each manufacturer gets its own folder. It should be capitalized nicely and use spaces, like `Teenage Engineering` (not like `teenage-engineering`).
 - Each device gets its own CSV file inside its manufacturer's folder. It should likewise be capitalized nicely and use spaces, and not include the manufacturer's name, like `Analog Four Mk II.csv` (not like `analog-four.csv` and not like `Elektron Analog Four.csv`)
 - Each CSV should contain our best effort to document that device's entire list of MIDI CCs (and NRPNs). If there's any vagueness in your definitions, you can add explanations in the Notes column.
 - Once your CSV is merged into this repository, your device will appear on the MIDI database's website with our thanks!

And here's how you should use the CSV:

 - Orientation should be either `0-based` or `centered`
 - Usage should look like this: `0: Off; 1-127: On`. Values can be single numbers (`0: Off`) or ranges defined as numbers separated by a dash (`1-127: On`). Colons `:` and semi-colons `;` are reserved for delimiting values. 
