from __future__ import annotations

import importlib.util
import tempfile
import textwrap
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "validate_readme_rules.py"
SPEC = importlib.util.spec_from_file_location("validate_readme_rules", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class ReadmeRulesTests(unittest.TestCase):
    def write_csv(self, relative_path: str, body: str) -> Path:
        root = Path(tempfile.mkdtemp())
        path = root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(body).strip() + "\n", encoding="utf-8")
        return path

    def test_accepts_a_valid_new_csv(self) -> None:
        path = self.write_csv(
            "Teenage Engineering/Analog Four Mk II.csv",
            """
            manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
            Elektron,Analog Four Mk II,Oscillator,Shape,,5,,0,127,,,,,,,0-based,,0: Square; 1: Sawtooth; 2~127: Morph
            Elektron,Analog Four Mk II,Amp,Pan,,10,,0,127,,,,,,,centered,,0~127: Pan amount
            """,
        )

        self.assertEqual(MODULE.validate_new_csv_path(Path("Teenage Engineering/Analog Four Mk II.csv")), [])
        self.assertEqual(MODULE.validate_csv_contents(path), [])

    def test_rejects_root_level_csv_files(self) -> None:
        errors = MODULE.validate_new_csv_path(Path("Analog Four Mk II.csv"))
        self.assertTrue(any("manufacturer" in error for error in errors))

    def test_rejects_lowercase_slug_manufacturer_folders(self) -> None:
        errors = MODULE.validate_new_csv_path(Path("teenage-engineering/Analog Four Mk II.csv"))
        self.assertTrue(any("lowercase slugs" in error for error in errors))

    def test_rejects_lowercase_slug_device_filenames(self) -> None:
        errors = MODULE.validate_new_csv_path(Path("Elektron/analog-four.csv"))
        self.assertTrue(any("device filenames" in error for error in errors))

    def test_rejects_device_filenames_that_repeat_the_manufacturer(self) -> None:
        errors = MODULE.validate_new_csv_path(Path("Elektron/Elektron Analog Four.csv"))
        self.assertTrue(any("repeat the manufacturer" in error for error in errors))

    def test_rejects_invalid_orientation_values(self) -> None:
        path = self.write_csv(
            "Elektron/Analog Four Mk II.csv",
            """
            manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
            Elektron,Analog Four Mk II,Oscillator,Shape,,5,,0,127,,,,,,,bipolar,,0: Square; 1: Sawtooth
            """,
        )

        errors = MODULE.validate_csv_contents(path)
        self.assertTrue(any("orientation" in error for error in errors))

    def test_rejects_invalid_usage_strings(self) -> None:
        path = self.write_csv(
            "Elektron/Analog Four Mk II.csv",
            """
            manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
            Elektron,Analog Four Mk II,Oscillator,Shape,,5,,0,127,,,,,,,0-based,,Square
            """,
        )

        errors = MODULE.validate_csv_contents(path)
        self.assertTrue(any("usage" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
