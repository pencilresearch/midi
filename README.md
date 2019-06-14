# MIDI CC database

This is the MIDI CC database maintained by User Camp. We want to document the MIDI implementation of every synthesizer.

You might like to [visit the MIDI library's website](https://midi.user.camp) to browse this data more conveniently.

As well as the website, this database powers Condukt's built-in device definitions. Condukt is a performance MIDI controller for iPad. You can [sign up for Condukt's development newsletter](https://user.camp/apps/condukt/), or [follow us on Twitter](https://twitter.com/goodcondukt).

The portions of this database that refer to specific devices may be owned by the devices' respective manufacturers. For everything else, see LICENSE.

## Contributing

We welcome and value contributions from the community. You can open issues here on GitHub, or send us pull requests. Alternatively, download and alter any CSV you like, and email it to [midi@user.camp](mailto:midi@user.camp) and we'll publish your changes for you.

If you want to add a new device, download `template.csv` to get started. You can edit this file with any spreadsheet program (like Excel) or text editor.

Here's how the project is structured:

 - Each manufacturer gets its own folder. It should be capitalized nicely and use spaces, like `Teenage Engineering` (not like `teenage-engineering`).
 - Each device gets its own CSV file inside its manufacturer's folder. It should likewise be capitalized nicely and use spaces, and not include the manufacturer's name, like `Analog Four Mk II.csv` (not like `analog-four.csv` and not like `Elektron Analog Four.csv`)
 - Each CSV should contain our best effort to document that device's entire list of MIDI CC (and NRPNs). If there's any vagueness in your definitions, you can add explanations in the Notes column.
 - Once your CSV is merged into this repository, your device will appear on the MIDI database's website with our thanks!
