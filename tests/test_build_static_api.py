from __future__ import annotations

import importlib.util
import json
import tempfile
import textwrap
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "build_static_api.py"
SPEC = importlib.util.spec_from_file_location("build_static_api", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class BuildStaticApiTests(unittest.TestCase):
    def make_repo(self) -> Path:
        return Path(tempfile.mkdtemp())

    def write_csv(self, repo_root: Path, relative_path: str, body: str) -> None:
        path = repo_root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(textwrap.dedent(body).strip() + "\n", encoding="utf-8")

    def test_build_site_generates_index_and_device_payloads(self) -> None:
        repo_root = self.make_repo()
        output_dir = repo_root / "site"

        self.write_csv(
            repo_root,
            "Teenage Engineering/OP-1 field.csv",
            """
            manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
            Teenage Engineering,OP-1 field,Synth,Color,,5,,0,127,,,,,,,0-based,,0~127: Morph amount
            Teenage Engineering,OP-1 field,Amp,Pan,,10,,0,127,,,,,,,centered,,0~127: Pan amount
            """,
        )

        self.write_csv(
            repo_root,
            "Erica Synths/PĒRKONS HD-01.csv",
            """
            manufacturer,device,section,parameter_name,parameter_description,cc_msb,cc_lsb,cc_min_value,cc_max_value,cc_default_value,nrpn_msb,nrpn_lsb,nrpn_min_value,nrpn_max_value,nrpn_default_value,orientation,notes,usage
            Erica Synths,PĒRKONS HD-01,Voice,Tone,,20,,0,127,,,,,,,0-based,,0: Low; 1: High
            """,
        )

        catalog = MODULE.build_site(repo_root, output_dir)

        self.assertEqual(catalog["counts"]["manufacturers"], 2)
        self.assertEqual(catalog["counts"]["devices"], 2)
        self.assertTrue((output_dir / ".nojekyll").exists())
        self.assertTrue((output_dir / "index.html").exists())

        index_payload = json.loads((output_dir / "api" / "index.json").read_text(encoding="utf-8"))
        self.assertEqual(index_payload["counts"]["devices"], 2)

        manufacturers_payload = json.loads(
            (output_dir / "api" / "manufacturers.json").read_text(encoding="utf-8")
        )
        slugs = {item["manufacturer_slug"] for item in manufacturers_payload["manufacturers"]}
        self.assertEqual(slugs, {"teenage-engineering", "erica-synths"})

        device_payload = json.loads(
            (
                output_dir
                / "api"
                / "device"
                / "teenage-engineering"
                / "op-1-field.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(device_payload["parameter_count"], 2)
        self.assertEqual(device_payload["parameters"][0]["cc_msb"], 5)
        self.assertEqual(device_payload["parameters"][0]["cc_lsb"], None)
        self.assertEqual(device_payload["sections"][0]["name"], "Amp")

    def test_slugify_removes_accents_and_symbols(self) -> None:
        self.assertEqual(MODULE.slugify("PĒRKONS HD-01"), "perkons-hd-01")
        self.assertEqual(MODULE.slugify("Beetlecrab.audio"), "beetlecrab-audio")


if __name__ == "__main__":
    unittest.main()
