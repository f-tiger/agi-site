#!/usr/bin/env python3
"""Negative structural fixtures, not a substitute for dynamic release Gate B.

Run: python -m unittest -v test_validation
Uses the actual retained UI export as a baseline; all mutations use temp copies.
"""
import contextlib
from hashlib import sha256
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile

import validate_export as validator

ROOT = Path(__file__).resolve().parent
TITLE = "A focused coffee launch"
SLIDE = "ppt/slides/slide1.xml"
NOTES = "ppt/notesSlides/notesSlide1.xml"


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.baseline = Path(os.environ.get("TEST_PPTX_PATH", ROOT / "evidence/live-ui-export.pptx")).read_bytes()
        cls.project_data = (ROOT / "demo-project.json").read_bytes()

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.temp = Path(self.directory.name)
        self.pptx = self.temp / "actual.pptx"
        self.project = self.temp / "project.json"
        self.manifest = self.temp / "input-manifest.json"
        self.pptx.write_bytes(self.baseline)
        self.project.write_bytes(self.project_data)
        self.manifest.write_text(json.dumps({"schema_version": 1, "inputs": self.hashes()}))

    def hashes(self, title=TITLE, selectors=None):
        result = {"project_sha256": sha256(self.project.read_bytes()).hexdigest(), "pptx_sha256": sha256(self.pptx.read_bytes()).hexdigest(), "expected_title_sha256": sha256(title.encode()).hexdigest()}
        if selectors:
            result["selectors_sha256"] = sha256(Path(selectors).read_bytes()).hexdigest()
        return result

    def run_validation(self, **kwargs):
        return validator.validate(self.pptx, self.project, kwargs.pop("title", TITLE), kwargs.pop("input_manifest", self.manifest), **kwargs)

    def reasons(self, report):
        return [item.get("reason") for item in report["checks"]]

    def assert_failed(self, report, reason=None):
        self.assertEqual(report["status"], "fail", report)
        self.assertFalse(report["cache_used"])
        self.assertEqual(set(report["release_gates"].values()), {"not-run"})
        self.assertNotIn(str(self.temp), json.dumps(report))
        if reason:
            self.assertIn(reason, self.reasons(report))

    def mutate(self, transforms=None, omit=(), extra=None):
        transforms = transforms or {}
        with zipfile.ZipFile(io.BytesIO(self.baseline)) as source, zipfile.ZipFile(self.pptx, "w", zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                if item.filename in omit:
                    continue
                content = source.read(item)
                if item.filename in transforms:
                    content = transforms[item.filename](content)
                target.writestr(item.filename, content)
            for name, content in (extra or {}).items():
                target.writestr(name, content)

    def test_actual_retained_export_matches_bound_inputs(self):
        result = self.run_validation()
        self.assertEqual(result["status"], "pass", result)
        self.assertEqual(result["artifact_status"], "pass")
        self.assertEqual(result["artifact"]["native_text_shapes"], 6)
        self.assertEqual(result["artifact"]["slide_count"], 1)
        self.assertEqual(set(result["release_gates"].values()), {"not-run"})

    def test_no_manifest_requires_review(self):
        result = self.run_validation(input_manifest=None)
        self.assertEqual(result["status"], "review-needed")
        self.assertEqual(result["artifact_status"], "pass")
        self.assertIn("input_manifest_not_supplied", self.reasons(result))

    def test_missing_pptx_fails(self):
        self.pptx.unlink()
        self.assert_failed(self.run_validation(), "pptx_missing")

    def test_zero_byte_pptx_fails(self):
        self.pptx.write_bytes(b"")
        self.assert_failed(self.run_validation(), "pptx_empty")

    def test_nonzip_pptx_fails(self):
        self.pptx.write_bytes(b"not a PPTX")
        self.assert_failed(self.run_validation(), "zip_integrity_failure")

    def test_truncated_pptx_fails(self):
        self.pptx.write_bytes(self.baseline[:500])
        self.assert_failed(self.run_validation(), "zip_integrity_failure")

    def test_crc_corruption_fails(self):
        with zipfile.ZipFile(self.pptx, "w", zipfile.ZIP_STORED) as archive:
            archive.writestr("[Content_Types].xml", b"SENTINEL_VALID_XML")
        self.pptx.write_bytes(self.pptx.read_bytes().replace(b"SENTINEL_VALID_XML", b"SENTINEL_BROKE_XML"))
        self.assert_failed(self.run_validation(), "zip_integrity_failure")

    def test_title_tamper_fails(self):
        self.mutate({SLIDE: lambda data: data.replace(TITLE.encode(), b"A invented revenue claim")})
        self.assert_failed(self.run_validation(), "native_text_content_mismatch")

    def test_expected_title_change_fails(self):
        self.assert_failed(self.run_validation(title="A clearer coffee launch"), "native_text_content_mismatch")

    def test_changed_claim_fails(self):
        self.mutate({SLIDE: lambda data: data.replace(b"One product page", b"Guaranteed 300% revenue growth")})
        self.assert_failed(self.run_validation(), "native_text_content_mismatch")

    def test_changed_project_claim_fails_against_real_export(self):
        project = json.loads(self.project_data)
        project["values"]["slides"][0]["body"] = "Guaranteed 300% revenue growth"
        self.project.write_text(json.dumps(project))
        self.assert_failed(self.run_validation(), "native_text_content_mismatch")

    def test_stale_project_hash_fails_even_if_slide_text_unchanged(self):
        project = json.loads(self.project_data)
        project["values"]["brief"] += " Input changed since capture."
        self.project.write_text(json.dumps(project))
        self.assert_failed(self.run_validation(), "input_hash_mismatch")

    def test_matched_project_and_artifact_change_still_fails_old_manifest(self):
        project = json.loads(self.project_data)
        project["values"]["slides"][0]["body"] = project["values"]["slides"][0]["body"].replace("One product page", "Two product pages")
        self.project.write_text(json.dumps(project))
        self.mutate({SLIDE: lambda data: data.replace(b"One product page", b"Two product pages")})
        self.assert_failed(self.run_validation(), "input_hash_mismatch")

    def test_stale_pptx_hash_fails_for_unrelated_metadata_change(self):
        self.mutate({"docProps/core.xml": lambda data: data.replace(b"<cp:revision>1", b"<cp:revision>2")})
        self.assert_failed(self.run_validation(), "input_hash_mismatch")

    def test_missing_manifest_fails(self):
        self.manifest.unlink()
        self.assert_failed(self.run_validation(), "manifest_missing")

    def test_empty_manifest_fails(self):
        self.manifest.write_bytes(b"")
        self.assert_failed(self.run_validation(), "manifest_empty")

    def test_notes_tamper_fails(self):
        self.mutate({NOTES: lambda data: data.replace(b"No commercial outcome is implied.", b"Commercial outcomes guaranteed.")})
        self.assert_failed(self.run_validation(), "speaker_notes_mismatch")

    def test_source_tamper_fails(self):
        self.mutate({SLIDE: lambda data: data.replace(b"All names and project details are invented.", b"A real customer success story.")})
        self.assert_failed(self.run_validation(), "native_text_content_mismatch")

    def test_missing_notes_part_fails(self):
        self.mutate(omit=(NOTES,))
        self.assert_failed(self.run_validation(), "required_part_missing")

    def test_wrong_content_type_fails(self):
        self.mutate({"[Content_Types].xml": lambda data: data.replace(b"presentationml.slide+xml", b"application/xml")})
        self.assert_failed(self.run_validation(), "required_content_type_mismatch")

    def test_missing_relationship_target_fails(self):
        self.mutate({"ppt/slides/_rels/slide1.xml.rels": lambda data: data.replace(b"notesSlide1.xml", b"missing.xml")})
        self.assert_failed(self.run_validation(), "relationship_target_missing_or_unsafe")

    def test_external_relationship_fails(self):
        self.mutate({"ppt/slides/_rels/slide1.xml.rels": lambda data: data.replace(b'Target="../notesSlides/notesSlide1.xml"', b'Target="https://example.com/" TargetMode="External"')})
        self.assert_failed(self.run_validation(), "external_relationship")

    def test_url_disguised_as_internal_relationship_fails(self):
        self.mutate({"ppt/slides/_rels/slide1.xml.rels": lambda data: data.replace(b'Target="../notesSlides/notesSlide1.xml"', b'Target="https://example.com/"')})
        self.assert_failed(self.run_validation(), "unsafe_relationship_target")

    def test_unresolved_reference_fails(self):
        self.mutate({"ppt/presentation.xml": lambda data: data.replace(b'r:id="rId2"', b'r:id="rId999"')})
        self.assert_failed(self.run_validation(), "unresolved_xml_relationship_reference")

    def test_duplicate_zip_entry_fails(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.pptx, "a") as archive:
                archive.writestr(SLIDE, b"<duplicate/>")
        self.assert_failed(self.run_validation(), "duplicate_zip_entry")

    def test_path_traversal_part_fails(self):
        self.mutate(extra={"../hidden.xml": b"<hidden/>"})
        self.assert_failed(self.run_validation(), "unsafe_zip_path")

    def test_embedded_payload_fails(self):
        self.mutate(extra={"ppt/embeddings/secret.bin": b"unsupported data"})
        self.assert_failed(self.run_validation(), "unsupported_or_active_package_part")

    def test_dtd_is_rejected(self):
        self.mutate({SLIDE: lambda data: b'<!DOCTYPE sld [<!ENTITY msg "unsafe">]>' + data})
        self.assert_failed(self.run_validation(), "xml_dtd_or_entity")

    def test_private_path_is_not_echoed_in_report(self):
        private_path = b"/Users/private-person/Documents/private-document"
        self.mutate({"docProps/core.xml": lambda data: data.replace(b"<cp:revision>1", b"<!--" + private_path + b"--><cp:revision>1")})
        result = self.run_validation()
        self.assert_failed(result, "possible_private_path_leak")
        self.assertNotIn(private_path.decode(), json.dumps(result))

    def test_credential_in_xml_comment_is_not_echoed(self):
        fake_token = b"ghp_" + b"x" * 30
        self.mutate({"docProps/core.xml": lambda data: data.replace(b"<cp:revision>1", b"<!--" + fake_token + b"--><cp:revision>1")})
        result = self.run_validation()
        self.assert_failed(result, "possible_credential_leak")
        self.assertNotIn(fake_token.decode(), json.dumps(result))

    def test_entity_encoded_private_path_is_rejected(self):
        self.mutate({SLIDE: lambda data: data.replace(b"One product page", b"&#47;Users&#47;private-person&#47;file")})
        self.assert_failed(self.run_validation(), "possible_private_path_leak")

    def test_static_selectors_success_does_not_pass_dynamic_gate(self):
        selectors = ROOT / "tests/fixtures/selector-valid.html"
        self.manifest.write_text(json.dumps({"schema_version": 1, "inputs": self.hashes(selectors=selectors)}))
        result = self.run_validation(selectors_file=selectors)
        self.assertEqual(result["status"], "pass", result)
        self.assertEqual(result["release_gates"]["Gate B"], "not-run")

    def test_broken_selector_static_fixture_fails(self):
        self.assert_failed(self.run_validation(selectors_file=ROOT / "tests/fixtures/selector-broken.html"), "required_selector_missing_or_duplicated")

    def test_duplicate_selector_fails(self):
        selectors = self.temp / "duplicate.html"
        selectors.write_bytes((ROOT / "tests/fixtures/selector-valid.html").read_bytes() + b'<div id="dk-export"></div>')
        self.assert_failed(self.run_validation(selectors_file=selectors), "required_selector_missing_or_duplicated")

    def test_cli_overwrites_previous_success_after_missing_artifact(self):
        report = self.temp / "report.json"
        command = [sys.executable, str(ROOT / "validate_export.py"), "--pptx", str(self.pptx), "--project", str(self.project), "--expected-title", TITLE, "--input-manifest", str(self.manifest), "--report", str(report)]
        first = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(first.returncode, 0, first.stdout)
        self.assertEqual(json.loads(report.read_text())["status"], "pass")
        self.pptx.unlink()
        second = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(second.returncode, 1, second.stdout)
        self.assert_failed(json.loads(report.read_text()), "pptx_missing")
        self.assertNotIn(str(self.temp), second.stdout + second.stderr + report.read_text())

    def test_cli_no_manifest_returns_exit_two(self):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            code = validator.main(["--pptx", str(self.pptx), "--project", str(self.project), "--report", str(self.temp / "report.json")])
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(output.getvalue())["status"], "review-needed")


if __name__ == "__main__":
    unittest.main(verbosity=2)
