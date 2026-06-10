import { walk } from "@std/fs";
import { relative, resolve } from "@std/path";
import { parseCSV } from "./parse.ts";
import { validateFile, validateRow } from "./validate.ts";

const ROOT = new URL("../../", import.meta.url).pathname;

function isExcluded(absPath: string): boolean {
  // template.csv at the repo root is a scaffolding file, not a real definition.
  return resolve(absPath) === resolve(ROOT, "template.csv");
}

async function collectCSVFiles(): Promise<string[]> {
  // If CSV_FILES env var is set, use only those (relative paths from repo root)
  const csvFilesEnv = Deno.env.get("CSV_FILES");
  if (csvFilesEnv !== undefined) {
    return csvFilesEnv
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && f.endsWith(".csv"))
      .map((f) => resolve(ROOT, f))
      .filter((f) => !isExcluded(f));
  }

  // Otherwise walk all CSV files
  const files: string[] = [];
  for await (const entry of walk(ROOT, { exts: [".csv"] })) {
    if (isExcluded(entry.path)) continue;
    files.push(entry.path);
  }
  files.sort();
  return files;
}

Deno.test("CSV validation", async () => {
  const files = await collectCSVFiles();

  if (files.length === 0) {
    if (Deno.env.get("CSV_FILES") !== undefined) {
      console.log("No changed CSV files to check");
      return;
    }
    throw new Error("No CSV files found to check");
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = await Deno.readTextFile(file);
    const { rows, errors: parseErrors } = parseCSV(content, rel);
    allErrors.push(...parseErrors);
    const fileResult = validateFile(rows, rel);
    allErrors.push(...fileResult.errors);
    allWarnings.push(...fileResult.warnings);

    for (const row of rows) {
      const { errors, warnings } = validateRow(row, rel);
      allErrors.push(...errors);
      allWarnings.push(...warnings);
    }
  }

  if (allWarnings.length > 0) {
    console.warn(
      allWarnings.length + " warning(s):\n\n" + allWarnings.map((w) => "  ⚠️  " + w).join("\n"),
    );
  }

  if (allErrors.length > 0) {
    throw new Error(
      allErrors.length + " error(s) in " + files.length + " file(s):\n\n" +
        allErrors.map((e) => "  ❌ " + e).join("\n"),
    );
  }
});
