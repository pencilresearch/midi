#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import tempfile
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
NUMERIC_FIELDS = {
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
}


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return re.sub(r"-{2,}", "-", slug) or "item"


def unique_slug(name: str, used: set[str]) -> str:
    base = slugify(name)
    slug = base
    suffix = 2
    while slug in used:
        slug = f"{base}-{suffix}"
        suffix += 1
    used.add(slug)
    return slug


def clean_value(field: str, value: str | None) -> object:
    if value is None:
        return None

    trimmed = value.strip()
    if trimmed == "":
        return None

    if field in NUMERIC_FIELDS:
        try:
            return int(trimmed)
        except ValueError:
            return trimmed

    return trimmed


def load_device_file(csv_path: Path, repo_root: Path) -> dict[str, object]:
    manufacturer = csv_path.parent.name
    device = csv_path.stem

    parameters: list[dict[str, object]] = []
    sections: dict[str, int] = defaultdict(int)

    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for line_number, row in enumerate(reader, start=2):
            parameter = {"row_number": line_number}
            for field, value in row.items():
                if field in {"manufacturer", "device"}:
                    continue
                parameter[field] = clean_value(field, value)

            section_name = parameter.get("section")
            if isinstance(section_name, str) and section_name:
                sections[section_name] += 1

            parameters.append(parameter)

    return {
        "manufacturer": manufacturer,
        "device": device,
        "csv_path": str(csv_path.relative_to(repo_root)),
        "parameter_count": len(parameters),
        "sections": [
            {"name": name, "parameter_count": count}
            for name, count in sorted(sections.items())
        ],
        "parameters": parameters,
    }


def collect_catalog(repo_root: Path) -> dict[str, object]:
    manufacturer_records: list[dict[str, object]] = []
    devices_summary: list[dict[str, object]] = []
    device_details: list[dict[str, object]] = []
    manufacturer_slug_map: dict[str, str] = {}
    used_manufacturer_slugs: set[str] = set()

    manufacturer_dirs = sorted(
        path for path in repo_root.iterdir() if path.is_dir() and not path.name.startswith(".")
    )

    total_parameters = 0

    for manufacturer_dir in manufacturer_dirs:
        csv_files = sorted(manufacturer_dir.glob("*.csv"))
        if not csv_files:
            continue

        manufacturer = manufacturer_dir.name
        manufacturer_slug = unique_slug(manufacturer, used_manufacturer_slugs)
        manufacturer_slug_map[manufacturer] = manufacturer_slug
        used_device_slugs: set[str] = set()

        devices_for_manufacturer: list[dict[str, object]] = []

        for csv_file in csv_files:
            detail = load_device_file(csv_file, repo_root)
            device_slug = unique_slug(str(detail["device"]), used_device_slugs)

            detail["manufacturer_slug"] = manufacturer_slug
            detail["device_slug"] = device_slug
            detail["api_path"] = f"../../device/{manufacturer_slug}/{device_slug}.json"

            summary = {
                "manufacturer": manufacturer,
                "manufacturer_slug": manufacturer_slug,
                "device": detail["device"],
                "device_slug": device_slug,
                "csv_path": detail["csv_path"],
                "parameter_count": detail["parameter_count"],
                "api_path": f"device/{manufacturer_slug}/{device_slug}.json",
            }

            devices_for_manufacturer.append(
                {
                    "device": detail["device"],
                    "device_slug": device_slug,
                    "csv_path": detail["csv_path"],
                    "parameter_count": detail["parameter_count"],
                    "api_path": f"../device/{manufacturer_slug}/{device_slug}.json",
                }
            )
            devices_summary.append(summary)
            device_details.append(detail)
            total_parameters += int(detail["parameter_count"])

        manufacturer_records.append(
            {
                "manufacturer": manufacturer,
                "manufacturer_slug": manufacturer_slug,
                "device_count": len(devices_for_manufacturer),
                "api_path": f"manufacturer/{manufacturer_slug}.json",
                "devices": devices_for_manufacturer,
            }
        )

    manufacturer_records.sort(key=lambda item: str(item["manufacturer"]))
    devices_summary.sort(key=lambda item: (str(item["manufacturer"]), str(item["device"])))
    device_details.sort(key=lambda item: (str(item["manufacturer"]), str(item["device"])))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manufacturers": manufacturer_records,
        "devices": devices_summary,
        "device_details": device_details,
        "counts": {
            "manufacturers": len(manufacturer_records),
            "devices": len(devices_summary),
            "parameters": total_parameters,
        },
    }


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_index_html(output_dir: Path) -> None:
    html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MIDI Guide JSON API</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem auto; max-width: 48rem; padding: 0 1rem; line-height: 1.5; }
      code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
    </style>
  </head>
  <body>
    <h1>MIDI Guide JSON API</h1>
    <p>This is a static API generated from the repository CSV files.</p>
    <ul>
      <li><a href="./api/index.json"><code>./api/index.json</code></a></li>
      <li><a href="./api/manufacturers.json"><code>./api/manufacturers.json</code></a></li>
      <li><a href="./api/devices.json"><code>./api/devices.json</code></a></li>
    </ul>
  </body>
</html>
"""
    (output_dir / "index.html").write_text(html, encoding="utf-8")


def replace_directory(output_dir: Path) -> Path:
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(
        tempfile.mkdtemp(prefix=f".{output_dir.name}-", dir=str(output_dir.parent))
    )
    return temp_dir


def finalize_directory(temp_dir: Path, output_dir: Path) -> None:
    backup_dir = output_dir.parent / f".{output_dir.name}.old"
    if backup_dir.exists():
        shutil.rmtree(backup_dir, ignore_errors=True)

    if output_dir.exists():
        output_dir.rename(backup_dir)

    temp_dir.rename(output_dir)

    if backup_dir.exists():
        shutil.rmtree(backup_dir, ignore_errors=True)


def build_site(repo_root: Path, output_dir: Path) -> dict[str, object]:
    catalog = collect_catalog(repo_root)
    temp_output_dir = replace_directory(output_dir)

    api_dir = temp_output_dir / "api"
    counts = catalog["counts"]

    write_json(
        api_dir / "index.json",
        {
            "api_version": 1,
            "generated_at": catalog["generated_at"],
            "counts": counts,
            "paths": {
                "manufacturers": "manufacturers.json",
                "devices": "devices.json",
            },
        },
    )

    write_json(
        api_dir / "manufacturers.json",
        {
            "generated_at": catalog["generated_at"],
            "count": counts["manufacturers"],
            "manufacturers": [
                {
                    "manufacturer": item["manufacturer"],
                    "manufacturer_slug": item["manufacturer_slug"],
                    "device_count": item["device_count"],
                    "api_path": item["api_path"],
                }
                for item in catalog["manufacturers"]
            ],
        },
    )

    write_json(
        api_dir / "devices.json",
        {
            "generated_at": catalog["generated_at"],
            "count": counts["devices"],
            "devices": catalog["devices"],
        },
    )

    for manufacturer in catalog["manufacturers"]:
        write_json(
            api_dir / manufacturer["api_path"],
            {
                "generated_at": catalog["generated_at"],
                "manufacturer": manufacturer["manufacturer"],
                "manufacturer_slug": manufacturer["manufacturer_slug"],
                "device_count": manufacturer["device_count"],
                "devices": manufacturer["devices"],
            },
        )

    for detail in catalog["device_details"]:
        write_json(
            api_dir / f"device/{detail['manufacturer_slug']}/{detail['device_slug']}.json",
            {
                "generated_at": catalog["generated_at"],
                "manufacturer": detail["manufacturer"],
                "manufacturer_slug": detail["manufacturer_slug"],
                "device": detail["device"],
                "device_slug": detail["device_slug"],
                "csv_path": detail["csv_path"],
                "parameter_count": detail["parameter_count"],
                "sections": detail["sections"],
                "parameters": detail["parameters"],
            },
        )

    (temp_output_dir / ".nojekyll").write_text("", encoding="utf-8")
    write_index_html(temp_output_dir)
    finalize_directory(temp_output_dir, output_dir)
    return catalog


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a static JSON API from the repository CSV files."
    )
    parser.add_argument(
        "--output",
        default=str(REPO_ROOT / "site"),
        help="Output directory for the generated static site",
    )
    args = parser.parse_args()

    output_dir = Path(args.output).resolve()
    catalog = build_site(REPO_ROOT, output_dir)
    counts = catalog["counts"]

    print(
        "Built static API with "
        f"{counts['manufacturers']} manufacturers, "
        f"{counts['devices']} devices, "
        f"and {counts['parameters']} parameters at {output_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
