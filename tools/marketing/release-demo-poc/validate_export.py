#!/usr/bin/env python3
"""Fail-closed structural checks for the single-slide fictional coffee demo.

Only the standard library is required. This is NOT browser/release acceptance,
visual QA, provenance authentication, or a complete OOXML/security validator.
A hash manifest detects changed inputs, not whether a UI actually produced them.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import posixpath
import re
import tempfile
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
import zipfile

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "dc": "http://purl.org/dc/elements/1.1/",
    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
}
PML = "application/vnd.openxmlformats-officedocument.presentationml."
REQUIRED_TYPES = {
    "ppt/presentation.xml": PML + "presentation.main+xml",
    "ppt/slides/slide1.xml": PML + "slide+xml",
    "ppt/notesSlides/notesSlide1.xml": PML + "notesSlide+xml",
    "ppt/slideLayouts/slideLayout1.xml": PML + "slideLayout+xml",
    "ppt/slideMasters/slideMaster1.xml": PML + "slideMaster+xml",
    "ppt/notesMasters/notesMaster1.xml": PML + "notesMaster+xml",
    "ppt/theme/theme1.xml": "application/vnd.openxmlformats-officedocument.theme+xml",
    "docProps/core.xml": "application/vnd.openxmlformats-package.core-properties+xml",
    "docProps/app.xml": "application/vnd.openxmlformats-officedocument.extended-properties+xml",
}
REQUIRED_SELECTORS = ("dk-load", "dk-restore", "dk-title", "dk-export", "dk-status", "dk-preview")
MAX_ZIP_BYTES = 8 * 1024 * 1024
MAX_EXPANDED_BYTES = 16 * 1024 * 1024
LEAK_PATTERNS = {
    "private_path": re.compile(r"(?i)(?:file://|/(?:home|Users|root|workspace|tmp|private|mnt)/|[a-z]:[\\/](?:users|documents|temp)[\\/])"),
    "credential": re.compile(r"(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?i:bearer)\s+[A-Za-z0-9._-]{20,}|(?i:(?:api[_-]?key|access[_-]?token|secret|password)\s*[=:]\s*[\"']?)[A-Za-z0-9_./+-]{8,})"),
}


class InvalidEvidence(Exception):
    """Carries only fixed, public reason codes (never input data or paths)."""


def require(condition, code):
    if not condition:
        raise InvalidEvidence(code)


def digest(data):
    return sha256(data).hexdigest()


def safe_read(path, role, limit):
    try:
        with Path(path).open("rb") as handle:
            data = handle.read(limit + 1)
    except FileNotFoundError:
        raise InvalidEvidence(role + "_missing") from None
    except OSError:
        raise InvalidEvidence(role + "_unreadable") from None
    require(bool(data), role + "_empty")
    require(len(data) <= limit, role + "_oversized")
    return data


def scan_leaks(text):
    for kind, pattern in LEAK_PATTERNS.items():
        require(not pattern.search(text), "possible_" + kind + "_leak")


def parse_xml(data):
    require(not re.search(br"<!\s*(?:DOCTYPE|ENTITY)", data, re.I), "xml_dtd_or_entity")
    try:
        decoded = data.decode("utf-8-sig")
        require("\x00" not in decoded, "unsupported_xml_encoding")
        scan_leaks(decoded)
        root = ET.fromstring(data)
    except (ET.ParseError, ValueError, UnicodeError):
        raise InvalidEvidence("malformed_xml") from None
    # Scan decoded XML text/attributes too, preventing numeric-entity hiding.
    scan_leaks(" ".join(root.itertext()))
    scan_leaks(" ".join(value for node in root.iter() for value in node.attrib.values()))
    return root


def parse_project(data):
    try:
        project = json.loads(data)
        require(project["version"] == 1 and project["product"] == "bpj-proposal-deck", "project_format")
        values = project["values"]
        require(values["demo"] is True, "project_not_fictional_demo")
        require(len(values["slides"]) == 1, "project_not_single_slide")
        slide = values["slides"][0]
        require(slide["type"] == "cover", "project_not_cover")
        for key in ("title", "client", "author", "brief", "theme", "language"):
            require(isinstance(values[key], str), "project_field_type")
        for key in ("title", "body", "source", "notes"):
            require(isinstance(slide[key], str) and bool(slide[key].strip()), "project_field_type")
        require(values["theme"] in ("blue", "forest", "slate") and values["language"] == "en", "unsupported_project_settings")
        require("fictional" in slide["source"].lower() and "fictional" in slide["notes"].lower(), "fictional_disclosure_missing")
        require(len(slide["title"]) <= 56 and len(slide["body"]) <= 600, "project_text_too_long")
        scan_leaks(json.dumps(project, ensure_ascii=False))
        return values, slide
    except (KeyError, TypeError, IndexError, ValueError, UnicodeError):
        raise InvalidEvidence("project_invalid_json_or_schema") from None


def read_package(data):
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            require(len(entries) <= 250, "too_many_zip_entries")
            require(len({entry.filename for entry in entries}) == len(entries), "duplicate_zip_entry")
            require(sum(entry.file_size for entry in entries) <= MAX_EXPANDED_BYTES, "zip_expansion_limit")
            scan_leaks(archive.comment.decode("utf-8", errors="replace"))
            files = {}
            for entry in entries:
                name = entry.filename
                require(not name.startswith("/") and "\\" not in name and ".." not in name.split("/"), "unsafe_zip_path")
                require(not entry.flag_bits & 1, "encrypted_zip_entry")
                require((entry.external_attr >> 16) & 0o170000 != 0o120000, "zip_symlink")
                scan_leaks(name)
                scan_leaks(entry.comment.decode("utf-8", errors="replace"))
                if entry.is_dir():
                    continue
                require(name.endswith((".xml", ".rels")), "unsupported_or_active_package_part")
                require(not re.search(r"(?i)(vba|activeX|embeddings/|customXml/)", name), "unsupported_or_active_package_part")
                files[name] = archive.read(entry)  # Verifies each entry's CRC.
            require("[Content_Types].xml" in files and "_rels/.rels" in files, "missing_package_roots")
            require(set(REQUIRED_TYPES) <= files.keys(), "required_part_missing")
            return files, {name: parse_xml(content) for name, content in files.items()}
    except (zipfile.BadZipFile, zipfile.LargeZipFile, RuntimeError, EOFError, NotImplementedError):
        raise InvalidEvidence("zip_integrity_failure") from None


def check_content_types(roots):
    root = roots["[Content_Types].xml"]
    require(root.tag == "{" + NS["ct"] + "}Types", "invalid_content_types_root")
    overrides, defaults = {}, {}
    for item in root:
        if item.tag == "{" + NS["ct"] + "}Override":
            name = item.get("PartName", "")
            require(name.startswith("/") and name[1:] in roots and name[1:] not in overrides, "invalid_content_type_override")
            overrides[name[1:]] = item.get("ContentType")
        elif item.tag == "{" + NS["ct"] + "}Default":
            ext = item.get("Extension")
            require(ext and ext not in defaults, "duplicate_content_type_default")
            defaults[ext] = item.get("ContentType")
        else:
            raise InvalidEvidence("unknown_content_type_element")
    for name, expected in REQUIRED_TYPES.items():
        require(overrides.get(name) == expected, "required_content_type_mismatch")
    require(defaults.get("rels") == "application/vnd.openxmlformats-package.relationships+xml", "relationship_content_type_mismatch")
    for name in roots:
        if name != "[Content_Types].xml":
            require(overrides.get(name) or defaults.get(name.rsplit(".", 1)[-1]), "part_without_content_type")
    require(all("macro" not in str(v).lower() for v in overrides.values()), "active_content_type")


def relationship_source(name):
    if name == "_rels/.rels":
        return ""
    directory, filename = posixpath.split(name)
    require(posixpath.basename(directory) == "_rels", "invalid_relationship_location")
    return posixpath.join(posixpath.dirname(directory), filename[:-5])


def check_relationships(roots):
    relationships = {}
    for name, root in roots.items():
        if not name.endswith(".rels"):
            continue
        require(root.tag == "{" + NS["rel"] + "}Relationships", "invalid_relationship_root")
        source = relationship_source(name)
        require(not source or source in roots, "relationship_source_missing")
        mapping = {}
        for item in root:
            require(item.tag == "{" + NS["rel"] + "}Relationship", "invalid_relationship_element")
            rid, target, kind = item.get("Id"), item.get("Target", ""), item.get("Type", "")
            require(rid and rid not in mapping, "duplicate_or_missing_relationship_id")
            require(item.get("TargetMode", "Internal") == "Internal", "external_relationship")
            target = unquote(target)
            parsed = urlsplit(target)
            require(target and not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment and "\\" not in target, "unsafe_relationship_target")
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(source), target))
            require(not resolved.startswith(("/", "../")) and resolved in roots, "relationship_target_missing_or_unsafe")
            require(kind.startswith((NS["r"] + "/", "http://schemas.openxmlformats.org/package/2006/relationships/")), "unknown_relationship_type")
            mapping[rid] = (resolved, kind.rsplit("/", 1)[-1])
        relationships[source] = mapping
    require(sum(pair == ("ppt/presentation.xml", "officeDocument") for pair in relationships.get("", {}).values()) == 1, "presentation_root_relationship_missing")
    for source, root in roots.items():
        for node in root.iter():
            for key, value in node.attrib.items():
                if key.startswith("{" + NS["r"] + "}"):
                    require(value in relationships.get(source, {}), "unresolved_xml_relationship_reference")
    for source, expected in (
        ("ppt/slides/slide1.xml", {("ppt/slideLayouts/slideLayout1.xml", "slideLayout"), ("ppt/notesSlides/notesSlide1.xml", "notesSlide")}),
        ("ppt/notesSlides/notesSlide1.xml", {("ppt/slides/slide1.xml", "slide"), ("ppt/notesMasters/notesMaster1.xml", "notesMaster")}),
    ):
        require(expected <= set(relationships.get(source, {}).values()), "required_relationship_missing")
    reachable, pending = {""}, [""]
    while pending:
        for target, _ in relationships.get(pending.pop(), {}).values():
            if target not in reachable:
                reachable.add(target)
                pending.append(target)
    require(all(name in reachable for name in roots if not name.endswith(".rels") and name != "[Content_Types].xml"), "unreachable_package_part")
    return relationships


def paragraphs(shape):
    return "\n".join("".join(p.itertext()) for p in shape.findall("p:txBody/a:p", NS))


def wrap_lines(value, width):
    result = []
    for paragraph in value.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line, length = "", 0
        for char in paragraph:
            size = 2 if ord(char) > 255 else 1
            if length + size > width:
                result.append(line)
                line, length = "", 0
            line += char
            length += size
        result.append(line)
    return "\n".join(result)


def check_content(roots, rels, values, slide, expected_title):
    presentation = roots["ppt/presentation.xml"]
    require(presentation.tag == "{" + NS["p"] + "}presentation", "invalid_presentation_root")
    slide_ids = presentation.findall("p:sldIdLst/p:sldId", NS)
    require(len(slide_ids) == 1, "presentation_not_single_slide")
    rid = slide_ids[0].get("{" + NS["r"] + "}id")
    require(rels["ppt/presentation.xml"].get(rid) == ("ppt/slides/slide1.xml", "slide"), "slide_binding_mismatch")
    require(len([name for name in roots if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)]) == 1, "unexpected_slide_part")
    root = roots["ppt/slides/slide1.xml"]
    require(root.tag == "{" + NS["p"] + "}sld", "invalid_slide_root")
    require(not root.findall(".//p:pic", NS) and not root.findall(".//p:graphicFrame", NS) and not root.findall(".//a:blip", NS), "non_native_slide_content")
    body = wrap_lines(slide["body"], 66)
    require(len(body.split("\n")) <= 8, "scope_requires_multiple_export_slides")
    expected = [values["client"], wrap_lines(expected_title, 42), body, slide["source"], values["author"], "1 / 1"]
    shapes = root.findall("p:cSld/p:spTree/p:sp", NS)
    require(len(shapes) == 6, "unexpected_native_shape_count")
    require([paragraphs(shape) for shape in shapes] == expected, "native_text_content_mismatch")
    require(all(shape.findall("p:txBody/a:p/a:r/a:t", NS) for shape in shapes), "missing_native_text_runs")
    require([node.text or "" for node in root.findall(".//a:t", NS)] == [node.text or "" for shape in shapes for node in shape.findall(".//a:t", NS)], "unexpected_hidden_text")
    notes_root = roots["ppt/notesSlides/notesSlide1.xml"]
    require(notes_root.tag == "{" + NS["p"] + "}notes", "invalid_notes_root")
    notes_shapes = notes_root.findall("p:cSld/p:spTree/p:sp", NS)
    note_bodies = [paragraphs(shape) for shape in notes_shapes if shape.find("p:nvSpPr/p:nvPr/p:ph[@type='body']", NS) is not None]
    expected_notes = ",".join([slide["notes"], "Source: " + slide["source"], "Client: " + values["client"]])
    require(note_bodies == [expected_notes], "speaker_notes_mismatch")
    require([node.text or "" for node in notes_root.findall(".//a:t", NS)] == [expected_notes, "1"], "unexpected_notes_text")
    core = roots["docProps/core.xml"]
    for key, value in (("dc:title", values["title"]), ("dc:subject", values["client"]), ("dc:creator", values["author"]), ("cp:lastModifiedBy", values["author"])):
        require(core.findtext(key, namespaces=NS) == value, "document_metadata_mismatch")
    return {"slide_count": 1, "native_text_shapes": len(shapes), "native_text_runs": len(root.findall(".//a:t", NS)), "speaker_notes_matched": True}


class SelectorParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = Counter()

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key == "id":
                self.ids[value] += 1


def check_selectors(data):
    try:
        parser = SelectorParser()
        parser.feed(data.decode("utf-8"))
    except (ValueError, UnicodeError):
        raise InvalidEvidence("selector_html_invalid") from None
    require(all(parser.ids[key] == 1 for key in REQUIRED_SELECTORS), "required_selector_missing_or_duplicated")


def validate(pptx, project, expected_title, input_manifest=None, selectors_file=None):
    report = {
        "schema_version": 1,
        "validator_version": "1.0.0",
        "scope": "one-slide-pptx-structural-validation",
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "fail",
        "artifact_status": "not-run",
        "cache_used": False,
        "inputs": {},
        "checks": [],
        "release_gates": {"Gate A": "not-run", "Gate B": "not-run"},
        "limitations": [
            "This validates supplied PPTX bytes, not browser interaction or authenticated capture provenance.",
            "Hash comparison detects changes only; a newly created manifest is not a prior UI capture attestation.",
            "Native XML text nodes do not establish visual quality or desktop PowerPoint editing fidelity.",
            "Pattern-based leak scanning cannot prove absence of all secrets or personal data.",
            "Static selector preflight does not execute event handlers or demonstrate dynamic Gate B recovery.",
            "Full end-to-end gates remain blocked until browser capture and the required audio stack are available.",
        ],
    }

    def check(name, action):
        result = action()
        report["checks"].append({"check": name, "status": "pass"})
        return result

    active = "inputs"
    try:
        require(isinstance(expected_title, str) and 0 < len(expected_title.strip()) <= 56, "invalid_expected_title")
        scan_leaks(expected_title)
        project_data = safe_read(project, "project", 60000)
        pptx_data = safe_read(pptx, "pptx", MAX_ZIP_BYTES)
        report["inputs"] = {"project_sha256": digest(project_data), "pptx_sha256": digest(pptx_data), "expected_title_sha256": digest(expected_title.encode())}
        active = "project_schema"
        values, slide = check(active, lambda: parse_project(project_data))
        active = "zip_integrity_and_xml_safety"
        files, roots = check(active, lambda: read_package(pptx_data))
        active = "content_types"
        check(active, lambda: check_content_types(roots))
        active = "internal_relationships"
        rels = check(active, lambda: check_relationships(roots))
        active = "native_text_and_notes"
        report["artifact"] = check(active, lambda: check_content(roots, rels, values, slide, expected_title))
        report["artifact"].update({"bytes": len(pptx_data), "package_parts": len(files), "external_relationships": 0})
        report["artifact_status"] = "pass"
        if selectors_file:
            active = "static_selector_preflight"
            data = safe_read(selectors_file, "selectors", 1024 * 1024)
            report["inputs"]["selectors_sha256"] = digest(data)
            check(active, lambda: check_selectors(data))
        else:
            report["checks"].append({"check": "static_selector_preflight", "status": "not-run"})
        active = "input_hash_binding"
        if input_manifest:
            data = safe_read(input_manifest, "manifest", 60000)
            try:
                manifest = json.loads(data)
                require(manifest.get("schema_version") == 1 and isinstance(manifest.get("inputs"), dict), "manifest_invalid_schema")
                require(manifest["inputs"] == report["inputs"], "input_hash_mismatch")
            except (ValueError, TypeError, AttributeError):
                raise InvalidEvidence("manifest_invalid_json_or_schema") from None
            report["checks"].append({"check": active, "status": "pass"})
            report["status"] = "pass"
        else:
            report["checks"].append({"check": active, "status": "review-needed", "reason": "input_manifest_not_supplied"})
            report["status"] = "review-needed"
    except InvalidEvidence as error:
        report["checks"].append({"check": active, "status": "fail", "reason": str(error)})
        report["status"] = "fail"
        if report["artifact_status"] != "pass":
            report["artifact_status"] = "fail"
    except Exception:
        # Never turn unexpected errors into a pass; don't leak exception paths.
        report["checks"].append({"check": active, "status": "fail", "reason": "unexpected_validator_error"})
        report["status"] = "fail"
    return report


def write_report(report, destination):
    """Atomic replacement ensures an old success cannot survive a failed run."""
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=destination.parent, delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(report, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        temporary.replace(destination)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pptx", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--expected-title", default="A focused coffee launch")
    parser.add_argument("--input-manifest", help="Previously recorded schema_version=1 and inputs hash map; never a provenance attestation")
    parser.add_argument("--selectors-file", help="Local HTML for a STATIC required-ID preflight only")
    parser.add_argument("--report", required=True)
    args = parser.parse_args(argv)
    report = validate(args.pptx, args.project, args.expected_title, args.input_manifest, args.selectors_file)
    try:
        write_report(report, args.report)
    except OSError:
        print(json.dumps({"status": "fail", "reason": "report_write_failed"}))
        return 1
    print(json.dumps({"status": report["status"], "artifact_status": report["artifact_status"], "scope": report["scope"], "cache_used": False}))
    return {"pass": 0, "fail": 1, "review-needed": 2}[report["status"]]


if __name__ == "__main__":
    raise SystemExit(main())
