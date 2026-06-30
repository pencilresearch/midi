import type { TriggerRow } from "./parse-triggers.ts";
import type { ValidationResult } from "./validate.ts";
import { midiRange } from "./validate.ts";
import { parseUsageOptions } from "./usage.ts";

// MIDI channels a trigger can be received on: a literal 1-16, or one of the
// documented keywords (see CONTRIBUTING). "basic" = the device's single
// assigned receive channel, "omni" = all channels, "auto" = the channel that
// routes to the currently active/selected track.
const CHANNEL_KEYWORDS = new Set(["basic", "omni", "auto"]);

function rowLabel(row: TriggerRow, filename: string): string {
  return filename + ":" + row.line + " " + row.sound_name;
}

// Validate a single triggers row
export function validateTriggerRow(
  row: TriggerRow,
  filename: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = rowLabel(row, filename);

  // --- MIDI note range checks (0-127) ---
  for (
    const err of [
      midiRange(row.note_number_min_value, "Note min", label),
      midiRange(row.note_number_max_value, "Note max", label),
      midiRange(row.note_number_default_value, "Note default", label),
    ]
  ) {
    if (err) errors.push(err);
  }

  // --- midi_channel ---
  if (!row.midi_channel) {
    errors.push(`Missing midi_channel in: ${label}`);
  } else if (row.midi_channel.match(/^\d+$/)) {
    const ch = parseInt(row.midi_channel, 10);
    if (ch < 1 || ch > 16) {
      errors.push(
        `midi_channel ${ch} outside MIDI channel range 1-16 in: ${label}`,
      );
    }
  } else if (!CHANNEL_KEYWORDS.has(row.midi_channel)) {
    errors.push(
      `midi_channel "${row.midi_channel}" is not 1-16 or one of ` +
        `${[...CHANNEL_KEYWORDS].join(", ")} in: ${label}`,
    );
  }

  // --- Note number columns ---
  const min = row.note_number_min_value;
  const max = row.note_number_max_value;

  // min and max are required
  if (min === null) {
    errors.push(`Missing note_number_min_value in: ${label}`);
  }
  if (max === null) {
    errors.push(`Missing note_number_max_value in: ${label}`);
  }

  if (min !== null && max !== null) {
    // min greater than max
    if (min > max) {
      errors.push(
        `note_number_min_value ${min} greater than max ${max} in: ${label}`,
      );
    }

    // default outside min/max
    if (
      row.note_number_default_value !== null &&
      (row.note_number_default_value < min ||
        row.note_number_default_value > max)
    ) {
      errors.push(`Default note outside of min/max in: ${label}`);
    }
  }

  // --- velocity_usage ---
  // Velocity is its own axis (0-127), independent of the note range, so values
  // are checked against the velocity range, not the note min/max.
  const { options, errors: usageErrors } = parseUsageOptions(
    row.velocity_usage,
    label,
  );
  errors.push(...usageErrors);
  for (const k of Object.keys(options)) {
    const v = parseInt(k);
    if (v < 0 || v > 127) {
      errors.push(
        `velocity_usage value ${v} outside MIDI range 0-127 in: ${label}`,
      );
      break;
    }
  }

  return { errors, warnings };
}

// Validate file-level concerns across all triggers rows
export function validateTriggerFile(
  rows: TriggerRow[],
  filename: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // At least one data row
  if (rows.length === 0) {
    errors.push(filename + ": file has no data rows");
    return { errors, warnings };
  }

  const parts = filename.split("/");
  const folder = parts.length >= 2
    ? parts[parts.length - 2].normalize("NFC")
    : null;
  // Strip the full ".triggers.csv" suffix to recover the device name.
  const basename = parts.length >= 1
    ? parts[parts.length - 1].replace(/\.triggers\.csv$/, "").normalize("NFC")
    : null;

  // Check every row: manufacturer must match folder, device must match file
  // name. Deduplicate so N rows sharing a wrong value only error once.
  const seenManufacturer = new Set<string>();
  const seenDevice = new Set<string>();
  const seenMfrWhitespace = new Set<string>();
  const seenDevWhitespace = new Set<string>();
  for (const row of rows) {
    const manufacturer = row.manufacturer.normalize("NFC");
    const device = row.device.normalize("NFC");

    if (
      folder !== null && manufacturer !== folder &&
      !seenManufacturer.has(manufacturer)
    ) {
      seenManufacturer.add(manufacturer);
      errors.push(
        filename + ":" + row.line + ' manufacturer "' + manufacturer +
          '" does not match folder "' + folder + '"',
      );
    }
    if (
      basename !== null && device !== basename && !seenDevice.has(device)
    ) {
      seenDevice.add(device);
      errors.push(
        filename + ":" + row.line + ' device "' + device +
          '" does not match file name "' + basename + '"',
      );
    }

    if (
      row.manufacturer !== row.manufacturer.trim() &&
      !seenMfrWhitespace.has(row.manufacturer)
    ) {
      seenMfrWhitespace.add(row.manufacturer);
      errors.push(
        filename + ":" + row.line +
          " manufacturer has leading/trailing whitespace",
      );
    }
    if (
      row.device !== row.device.trim() && !seenDevWhitespace.has(row.device)
    ) {
      seenDevWhitespace.add(row.device);
      errors.push(
        filename + ":" + row.line +
          " device has leading/trailing whitespace",
      );
    }
  }

  return { errors, warnings };
}
