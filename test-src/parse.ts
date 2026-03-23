import { parse } from "@std/csv";

const EXPECTED_HEADERS = [
  "manufacturer",
  "device",
  "section",
  "parameter_name",
  "parameter_description",
  "cc_msb",
  "cc_lsb",
  "cc_min_value",
  "cc_max_value",
  "cc_default_value",
  "nrpn_msb",
  "nrpn_lsb",
  "nrpn_min_value",
  "nrpn_max_value",
  "nrpn_default_value",
  "orientation",
  "notes",
  "usage",
];

const NUMERIC_FIELDS = new Set([
  "cc_msb",
  "cc_lsb",
  "cc_min_value",
  "cc_max_value",
  "cc_default_value",
  "nrpn_msb",
  "nrpn_lsb",
  "nrpn_min_value",
  "nrpn_max_value",
  "nrpn_default_value",
]);

export interface Row {
  manufacturer: string;
  device: string;
  section: string;
  parameter_name: string;
  parameter_description: string;
  cc_msb: number | null;
  cc_lsb: number | null;
  cc_min_value: number | null;
  cc_max_value: number | null;
  cc_default_value: number | null;
  nrpn_msb: number | null;
  nrpn_lsb: number | null;
  nrpn_min_value: number | null;
  nrpn_max_value: number | null;
  nrpn_default_value: number | null;
  orientation: string;
  notes: string;
  usage: string;
  line: number;
}

export interface ParseResult {
  rows: Row[];
  errors: string[];
}

export function parseCSV(content: string, filename: string): ParseResult {
  const errors: string[] = [];
  const lines = content.split("\n");

  if (lines.length === 0) {
    errors.push(filename + ": empty file");
    return { rows: [], errors };
  }

  // Validate headers
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim());
  for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
    const got = headers[i] ?? "(missing)";
    if (got !== EXPECTED_HEADERS[i]) {
      errors.push(
        filename + ': expected header "' + EXPECTED_HEADERS[i] +
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
  const rows: Row[] = [];

  for (let i = 0; i < dataRecords.length; i++) {
    const record = dataRecords[i];
    // Skip empty rows
    if (
      record.length === 0 ||
      (record.length === 1 && record[0].trim() === "")
    ) continue;

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
    rows.push(row as unknown as Row);
  }

  return { rows, errors };
}
