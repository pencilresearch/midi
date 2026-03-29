#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
import re


REPO_ROOT = Path(__file__).resolve().parents[1]
VALID_ORIENTATIONS = {"0-based", "centered"}
LOWERCASE_SLUG_RE = re.compile(r"^[a-z0-9]+(?:[-_][a-z0-9]+)+$")
USAGE_KEY_RE = re.compile(r"^\d+(?:[-~]\d+)?$")


def repo_relative_path(path_text: str) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path.relative_to(REPO_ROOT)
    return path


def validate_new_csv_path(path: Path) -> list[str]:
    errors: list[str] = []

    if path.name == "template.csv":
        return errors

    if path.suffix.lower() != ".csv":
        errors.append(f"{path}: expected a .csv file")
        return errors

    if len(path.parts) != 2:
        errors.append(
            f"{path}: CSV files must live in '<manufacturer>/<device>.csv' at the repository root"
        )
        return errors

    manufacturer = path.parts[0]
    device_name = path.stem

    if LOWERCASE_SLUG_RE.fullmatch(manufacturer):
        errors.append(
            f"{path}: manufacturer folders must use readable names, not lowercase slugs like '{manufacturer}'"
        )

    if LOWERCASE_SLUG_RE.fullmatch(device_name):
        errors.append(
            f"{path}: device filenames must use readable names, not lowercase slugs like '{device_name}.csv'"
        )

    normalized_manufacturer = " ".join(manufacturer.split()).casefold()
    normalized_device = " ".join(device_name.split()).casefold()
    if normalized_device == normalized_manufacturer or normalized_device.startswith(
        f"{normalized_manufacturer} "
    ):
        errors.append(
            f"{path}: device filenames should not repeat the manufacturer name"
        )

    return errors


def validate_usage_text(usage: str) -> bool:
    text = usage.strip()
    if not text:
        return True

    for segment in text.split("; "):
        if ": " not in segment:
            return False
        key, label = segment.split(": ", 1)
        if not USAGE_KEY_RE.fullmatch(key):
            return False
        if not label.strip():
            return False
        if ";" in label:
            return False

    return True


def validate_csv_contents(path: Path) -> list[str]:
    errors: list[str] = []

    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = set(reader.fieldnames or [])
        missing_columns = {"orientation", "usage"} - fieldnames
        if missing_columns:
            missing_list = ", ".join(sorted(missing_columns))
            return [f"{path}: missing required column(s): {missing_list}"]

        for line_number, row in enumerate(reader, start=2):
            orientation = (row.get("orientation") or "").strip()
            if orientation not in VALID_ORIENTATIONS:
                errors.append(
                    f"{path}:{line_number}: orientation must be '0-based' or 'centered'"
                )

            usage = row.get("usage") or ""
            if usage.strip() and not validate_usage_text(usage):
                errors.append(
                    f"{path}:{line_number}: usage must use 'value: Label' entries separated by '; '"
                )

    return errors


def validate_paths(paths: list[str]) -> list[str]:
    errors: list[str] = []

    for path_text in paths:
        relative_path = repo_relative_path(path_text)
        absolute_path = REPO_ROOT / relative_path
        errors.extend(validate_new_csv_path(relative_path))

        if relative_path.name == "template.csv":
            continue

        if not absolute_path.exists():
            errors.append(f"{relative_path}: file does not exist")
            continue

        errors.extend(validate_csv_contents(absolute_path))

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate newly added CSV files against the repository README rules."
    )
    parser.add_argument("paths", nargs="+", help="CSV paths to validate")
    args = parser.parse_args(argv)

    errors = validate_paths(args.paths)
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    print(f"Validated {len(args.paths)} CSV file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
