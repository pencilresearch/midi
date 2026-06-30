import { parse } from "@std/csv";

export const EXPECTED_TRIGGER_HEADERS = [
  "manufacturer",
  "device",
  "section",
  "sound_name",
  "sound_description",
  "midi_channel",
  "note_number_min_value",
  "note_number_max_value",
  "note_number_default_value",
  "comments",
  "velocity_usage",
];

const NUMERIC_FIELDS = new Set([
  "note_number_min_value",
  "note_number_max_value",
  "note_number_default_value",
]);

export interface TriggerRow {
  manufacturer: string;
  device: string;
  section: string;
  sound_name: string;
  sound_description: string;
  midi_channel: string;
  note_number_min_value: number | null;
  note_number_max_value: number | null;
  note_number_default_value: number | null;
  comments: string;
  velocity_usage: string;
  line: number;
}

export interface TriggerParseResult {
  rows: TriggerRow[];
  errors: string[];
}

export function parseTriggerCSV(
  content: string,
  filename: string,
): TriggerParseResult {
  const errors: string[] = [];
  const lines = content.split("\n");

  if (lines.length === 0) {
    errors.push(filename + ": empty file");
    return { rows: [], errors };
  }

  // Validate headers
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim());
  for (let i = 0; i < EXPECTED_TRIGGER_HEADERS.length; i++) {
    const got = headers[i] ?? "(missing)";
    if (got !== EXPECTED_TRIGGER_HEADERS[i]) {
      errors.push(
        filename + ': expected header "' + EXPECTED_TRIGGER_HEADERS[i] +
          '" at column ' + (i + 1) + ', got "' + got + '"',
      );
    }
  }

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  // Parse with std/csv
  let records: string[][];
  try {
    records = parse(content, { skipFirstRow: false });
  } catch (e: unknown) {
    errors.push(filename + ": CSV parse error: " + String(e));
    return { rows: [], errors };
  }

  // Skip header row
  const dataRecords = records.slice(1);
  const rows: TriggerRow[] = [];

  for (let i = 0; i < dataRecords.length; i++) {
    const record = dataRecords[i];
    // Skip empty rows
    if (
      record.length === 0 ||
      (record.length === 1 && record[0].trim() === "")
    ) continue;

    // Check column count
    if (record.length !== EXPECTED_TRIGGER_HEADERS.length) {
      errors.push(
        filename + ":" + (i + 2) + " has " + record.length +
          " columns, expected " + EXPECTED_TRIGGER_HEADERS.length,
      );
      continue;
    }

    const row: Record<string, string | number | null> = {};
    for (let c = 0; c < headers.length; c++) {
      const val = (record[c] ?? "").trim();
      if (NUMERIC_FIELDS.has(headers[c])) {
        row[headers[c]] = val === "" ? null : parseInt(val, 10);
        if (val !== "" && isNaN(row[headers[c]] as number)) {
          errors.push(
            filename + ": row " + (i + 2) + ', column "' + headers[c] +
              '": "' + val + '" is not a valid number',
          );
          row[headers[c]] = null;
        }
      } else {
        row[headers[c]] = val;
      }
    }
    row.line = i + 2; // +2: 1-based + header row
    rows.push(row as unknown as TriggerRow);
  }

  return { rows, errors };
}
