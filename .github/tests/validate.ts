import type { Row } from "./parse.ts";

function rowLabel(row: Row, filename: string): string {
  return filename + ":" + row.line + " " + row.parameter_name;
}

function midiRange(
  value: number | null,
  name: string,
  label: string,
): string | null {
  if (value !== null && (value < 0 || value > 127)) {
    return name + " value " + value + " outside MIDI range 0-127 in: " + label;
  }
  return null;
}

// Validate a single row's fields
export function validateRow(row: Row, filename: string): string[] {
  const errors: string[] = [];
  const label = rowLabel(row, filename);

  // --- MIDI spec range checks (0-127) ---
  for (
    const err of [
      midiRange(row.cc_msb, "CC MSB", label),
      midiRange(row.cc_lsb, "CC LSB", label),
      midiRange(row.nrpn_msb, "NRPN MSB", label),
      midiRange(row.nrpn_lsb, "NRPN LSB", label),
    ]
  ) {
    if (err) errors.push(err);
  }

  // --- Usage checks ---
  const usageOptions: Record<string, string> = {};
  if (row.usage) {
    const parts = row.usage.split(";");
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part.length) continue;

      const sparts = part.split(":");
      if (sparts.length < 2) {
        errors.push(`Bad usage part, no ":" in "${part}" in: ${label}`);
        continue;
      }

      const values = sparts.shift()!.trim();
      const meaning = sparts.join(":").trim();

      if (values.match(/^\d+$/)) {
        if (!(values in usageOptions)) usageOptions[values] = meaning;
      } else if (values.match(/^\d+\s*[-~]\s*\d+$/)) {
        const match = values.match(/^(\d+)\s*[-~]\s*(\d+)$/)!;
        const s = parseInt(match[1]);
        const e = parseInt(match[2]);
        for (let v = s; v <= e; v++) {
          if (!(String(v) in usageOptions)) usageOptions[String(v)] = meaning;
        }
      } else {
        errors.push(
          `Bad usage part, values "${values}" not correctly formatted in "${part}" in: ${label}`,
        );
      }

      if (!meaning) {
        errors.push(`Bad usage part, no meaning in "${part}" in: ${label}`);
      }
    }
  }

  // --- Column checks ---

  // CC hi-res max value: if both MSB and LSB set, max must be 127 (except bank select LSB)
  if (
    row.cc_lsb !== null && row.cc_msb !== null &&
    row.cc_max_value !== null && row.cc_max_value < 127 &&
    !(row.cc_msb === 0 && row.cc_lsb === 32)
  ) {
    errors.push(`CC low max in hi-res CC in: ${label}`);
  }

  // CC LSB without MSB
  if (row.cc_lsb !== null && row.cc_msb === null) {
    errors.push(`CC LSB without CC MSB in: ${label}`);
  }

  // NRPN LSB without MSB
  if (row.nrpn_lsb !== null && row.nrpn_msb === null) {
    errors.push(`NRPN LSB without NRPN MSB in: ${label}`);
  }

  // Ambiguous max for CC & NRPN
  if (
    row.cc_lsb !== null &&
    row.cc_max_value !== null && row.nrpn_max_value !== null &&
    row.cc_max_value !== row.nrpn_max_value
  ) {
    errors.push(`Ambiguous max for CC & NRPN in: ${label}`);
  }

  // CC default outside min/max
  if (
    row.cc_min_value !== null && row.cc_max_value !== null &&
    row.cc_default_value !== null &&
    (row.cc_default_value < row.cc_min_value ||
      row.cc_default_value > row.cc_max_value)
  ) {
    errors.push(`Default outside of min/max for CC in: ${label}`);
  }

  // NRPN default outside min/max
  if (
    row.nrpn_min_value !== null && row.nrpn_max_value !== null &&
    row.nrpn_default_value !== null &&
    (row.nrpn_default_value < row.nrpn_min_value ||
      row.nrpn_default_value > row.nrpn_max_value)
  ) {
    errors.push(`Default outside of min/max for NRPN in: ${label}`);
  }

  // Default only set for one type (when both CC and NRPN exist)
  if (
    row.cc_msb !== null && row.nrpn_lsb !== null && row.nrpn_msb !== null &&
    (row.cc_default_value !== null || row.nrpn_default_value !== null) &&
    (row.cc_default_value === null || row.nrpn_default_value === null)
  ) {
    errors.push(`Default only set for one type in: ${label}`);
  }

  // Orientation must be 'centered' or '0-based'
  if (
    row.orientation &&
    row.orientation !== "centered" && row.orientation !== "0-based"
  ) {
    errors.push(
      `Orientation "${row.orientation}" not "centered" or "0-based" in: ${label}`,
    );
  }

  // --- Range checks ---
  const min = row.nrpn_min_value !== null
    ? row.nrpn_min_value
    : (row.cc_min_value !== null ? row.cc_min_value : -1);
  const max = row.nrpn_max_value !== null
    ? row.nrpn_max_value
    : (row.cc_max_value !== null ? row.cc_max_value : -1);

  if (min >= 0 && max >= 0) {
    // Min greater than max
    if (min > max) {
      errors.push(`min ${min} should be lower than max ${max} in: ${label}`);
    }

    // Usage range coverage
    const optionKeys = Object.keys(usageOptions);
    if (optionKeys.length > 1) {
      for (let i = min; i <= max; i++) {
        if (!(String(i) in usageOptions)) {
          errors.push(
            `No options specified for value ${i} in min ${min} max ${max} in: ${label}`,
          );
          break;
        }
      }
    }

    // Usage options outside range
    for (const k of optionKeys) {
      const v = parseInt(k);
      if (v < min || v > max) {
        errors.push(
          `Options specified outside range ${v} in min ${min} max ${max} in: ${label}`,
        );
        break;
      }
    }
  }

  return errors;
}

// Validate file-level concerns across all rows
export function validateFile(rows: Row[], filename: string): string[] {
  const errors: string[] = [];

  // At least one data row
  if (rows.length === 0) {
    errors.push(filename + ": file has no data rows");
    return errors;
  }

  // Folder name should match manufacturer field
  const parts = filename.split("/");
  if (parts.length >= 2) {
    const folder = parts[parts.length - 2];
    const manufacturer = rows[0].manufacturer;
    if (folder !== manufacturer) {
      errors.push(
        filename + ': folder "' + folder +
          '" does not match manufacturer "' + manufacturer + '"',
      );
    }
  }

  // All rows should have the same manufacturer and device
  const firstManufacturer = rows[0].manufacturer;
  const firstDevice = rows[0].device;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].manufacturer !== firstManufacturer) {
      errors.push(
        filename + ":" + rows[i].line + ' has manufacturer "' +
          rows[i].manufacturer + '", expected "' + firstManufacturer + '"',
      );
      break;
    }
    if (rows[i].device !== firstDevice) {
      errors.push(
        filename + ":" + rows[i].line + ' has device "' +
          rows[i].device + '", expected "' + firstDevice + '"',
      );
      break;
    }
  }

  // Whitespace in manufacturer/device
  if (firstManufacturer !== firstManufacturer.trim()) {
    errors.push(
      filename + ": manufacturer has leading/trailing whitespace",
    );
  }
  if (firstDevice !== firstDevice.trim()) {
    errors.push(filename + ": device has leading/trailing whitespace");
  }

  return errors;
}
