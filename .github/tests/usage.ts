// Shared parser for the usage range grammar, used by both the CC/NRPN `usage`
// column and the triggers `velocity_usage` column.
//
// A usage string is a ";"-separated list of "values: meaning" parts, where
// values is a single number ("64"), a stepped range ("0-63"), or a continuous
// range ("0~127"). This returns a map of every covered value to its meaning,
// plus any format errors. Range checks (which values are in bounds) are left to
// the caller, since they differ between contexts.

export interface UsageParseResult {
  options: Record<string, string>;
  errors: string[];
}

export function parseUsageOptions(
  usage: string,
  label: string,
): UsageParseResult {
  const options: Record<string, string> = {};
  const errors: string[] = [];

  if (!usage) return { options, errors };

  const parts = usage.split(";");
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
      if (!(values in options)) options[values] = meaning;
    } else if (values.match(/^\d+\s*[-~]\s*\d+$/)) {
      const match = values.match(/^(\d+)\s*[-~]\s*(\d+)$/)!;
      const s = parseInt(match[1]);
      const e = parseInt(match[2]);
      for (let v = s; v <= e; v++) {
        if (!(String(v) in options)) options[String(v)] = meaning;
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

  return { options, errors };
}
