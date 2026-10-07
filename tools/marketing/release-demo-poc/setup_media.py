#!/usr/bin/env python3
"""Runner-only verified Kokoro asset preparation; no synthesis or package install.

Run after `python -m pip install --report pip-install-report.json -r requirements.txt`.
Requires GITHUB_ACTIONS=true and KOKORO_MODEL_DIR. Do not upload the model cache
or Python environment as a deliverable; upload media evidence and rendered work.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata as md
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

RUNTIME_URL = "https://files.pythonhosted.org/packages/60/e1/a27e5a70a525a5ee1fd5357596f07b724d02ff317f134e86cb6e3d9db968/kokoro_onnx-0.6.1-py3-none-any.whl"
RUNTIME_SHA256 = "50c8de4950d601df41428ee5462a48c8a78bef441bf671f2492e070ef44d8a32"
PINS = {"kokoro-onnx": "0.6.1", "onnxruntime": "1.23.2", "numpy": "2.2.6",
        "espeakng-loader": "0.2.4", "phonemizer": "3.4.0", "soundfile": "0.13.1"}
RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/"
ASSETS = [
    {"filename": "kokoro-v1.0.onnx", "sha256": "beb0d1848dee9a49da392cc3df26958d46cfa35d321edf434f52949153f0df3a", "bytes": 325505369, "asset_id": 520133700},
    {"filename": "voices-v1.0.bin", "sha256": "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d", "bytes": 28214398, "asset_id": 520134664},
]
# These are public publisher/canonical-license sources, never authenticated APIs.
# Model-card license declaration is preserved alongside the full Apache text.
LICENSE_SOURCES = [
    ("kokoro-model-card.md", "https://huggingface.co/hexgrad/Kokoro-82M/raw/main/README.md", "license: apache-2.0"),
    ("Apache-2.0.txt", "https://www.apache.org/licenses/LICENSE-2.0.txt", "Version 2.0"),
    ("kokoro-onnx-MIT.txt", "https://raw.githubusercontent.com/thewh1teagle/kokoro-onnx/main/LICENSE", "MIT License"),
    ("onnxruntime-MIT.txt", "https://raw.githubusercontent.com/microsoft/onnxruntime/v1.23.2/LICENSE", "MIT License"),
    ("espeakng-loader-MIT.txt", "https://raw.githubusercontent.com/thewh1teagle/espeakng-loader/main/LICENSE", "MIT License"),
    ("phonemizer-GPL-3.0.txt", "https://raw.githubusercontent.com/bootphon/phonemizer/master/LICENSE", "GNU GENERAL PUBLIC LICENSE"),
    ("espeak-ng-GPL-3.0.txt", "https://raw.githubusercontent.com/espeak-ng/espeak-ng/master/COPYING", "GNU GENERAL PUBLIC LICENSE"),
]
ALLOWED_HOSTS = {"github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com",
                 "raw.githubusercontent.com", "huggingface.co", "www.apache.org", "apache.org",
                 "files.pythonhosted.org", "cdn-lfs.huggingface.co", "cdn-lfs-us-1.huggingface.co"}


class GateError(RuntimeError):
    """Safe public error code without credentials, redirect tokens or local paths."""


def canonical(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def validate_url(url: str) -> None:
    p = urllib.parse.urlsplit(url)
    if p.scheme != "https" or p.hostname not in ALLOWED_HOSTS or p.username or p.password:
        raise GateError("unapproved_download_destination")


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url: str, destination: Path, *, expected_hash: str | None = None,
          expected_bytes: int | None = None, maximum: int = 2_000_000) -> str:
    """Atomic, bounded HTTPS download; hash required by caller for binary assets."""
    validate_url(url)
    if expected_hash is not None and not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
        raise GateError("missing_or_invalid_expected_sha256")
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and expected_hash:
        if sha256(destination) != expected_hash or (expected_bytes and destination.stat().st_size != expected_bytes):
            raise GateError("cached_asset_hash_or_size_mismatch")
        return expected_hash
    temporary = destination.with_name(destination.name + ".partial")
    opener = urllib.request.build_opener(SafeRedirect())
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "release-demo-media-verifier/1.0"})
        with opener.open(request, timeout=120) as response, temporary.open("wb") as stream:
            validate_url(response.geturl())
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > maximum:
                    raise GateError("download_size_limit")
                stream.write(chunk)
        digest = sha256(temporary)
        if expected_bytes is not None and total != expected_bytes:
            raise GateError("download_size_mismatch")
        if expected_hash is not None and digest != expected_hash:
            raise GateError("download_sha256_mismatch")
        if not total:
            raise GateError("empty_download")
        temporary.replace(destination)
        return digest
    except GateError:
        raise
    except (urllib.error.URLError, OSError, TimeoutError):
        raise GateError("source_unavailable") from None
    finally:
        temporary.unlink(missing_ok=True)


def verify_runtime() -> dict:
    """Verify versions and pip's hash-checked direct-wheel installation record."""
    for name, expected in PINS.items():
        try:
            actual = md.version(name)
        except md.PackageNotFoundError:
            raise GateError("required_distribution_missing:" + name) from None
        if actual != expected:
            raise GateError("distribution_version_mismatch:" + name)
    dist = md.distribution("kokoro-onnx")
    try:
        record = json.loads(dist.read_text("direct_url.json") or "{}")
    except (ValueError, TypeError):
        raise GateError("runtime_origin_record_invalid") from None
    archive = record.get("archive_info", {})
    digest = archive.get("hashes", {}).get("sha256")
    if not digest and archive.get("hash", "").startswith("sha256="):
        digest = archive["hash"].split("=", 1)[1]
    if record.get("url") != RUNTIME_URL or digest != RUNTIME_SHA256:
        raise GateError("runtime_must_be_installed_from_hash_pinned_requirements")
    return {"name": "kokoro-onnx", "version": "0.6.1", "url": RUNTIME_URL,
            "wheel_sha256": RUNTIME_SHA256, "verification": "pip direct URL archive hash plus installed version"}


def license_inventory(root: Path) -> list[dict]:
    """Retain distribution metadata and all installed LICENSE/COPYING/NOTICE files."""
    inventory = []
    for dist in sorted(md.distributions(), key=lambda d: canonical(d.metadata.get("Name", "unknown"))):
        name = dist.metadata.get("Name", "unknown")
        label = canonical(name) + "-" + re.sub(r"[^A-Za-z0-9.+-]", "_", dist.version)
        target = root / "installed" / label
        target.mkdir(parents=True, exist_ok=True)
        copied = []
        for f in dist.files or []:
            relative = Path(str(f))
            basename = relative.name.lower()
            if not re.search(r"licen[cs]e|copying|notice|copyright", basename):
                continue
            if relative.suffix.lower() in {".py", ".pyc", ".so", ".pyd"}:
                continue
            source = Path(dist.locate_file(f))
            if not source.is_file() or source.stat().st_size > 5_000_000:
                continue
            safe = "__".join(x for x in relative.parts if x not in {"..", ".", "/"})
            dest = target / safe
            shutil.copyfile(source, dest)
            copied.append({"file": str(dest.relative_to(root)), "sha256": sha256(dest)})
        license_text = dist.metadata.get("License", "")
        if license_text:
            (target / "license-metadata.txt").write_text(license_text + "\n", encoding="utf-8")
        inventory.append({"name": name, "version": dist.version,
                          "license_expression": dist.metadata.get("License-Expression"),
                          "license_metadata": license_text,
                          "license_classifiers": [v for v in dist.metadata.get_all("Classifier", []) if v.startswith("License ::")],
                          "declared_license_files": dist.metadata.get_all("License-File", []),
                          "notice_files": copied,
                          "evidence_status": "bundled_text_copied" if copied else "metadata_only_no_bundled_text_found"})
    return inventory


def save_freeze(destination: Path) -> None:
    result = subprocess.run([sys.executable, "-m", "pip", "freeze", "--all"], text=True, capture_output=True, check=True)
    # Fail rather than save possible credentials or user-specific local URLs.
    for line in result.stdout.splitlines():
        if " @ " in line:
            url = line.split(" @ ", 1)[1]
            parsed = urllib.parse.urlsplit(url)
            if parsed.username or parsed.password or parsed.scheme != "https" or parsed.hostname != "files.pythonhosted.org":
                raise GateError("non_public_dependency_origin_in_freeze")
    destination.write_text(result.stdout, encoding="utf-8")


# Exact official notice snapshots observed for the wheel lacking bundled texts.
# Normalize only surrounding whitespace; any substantive upstream change fails closed.
ESPEAK_UPSTREAM_NOTICE_SPECS = (
    ("espeakng-loader-MIT.txt",
     "https://raw.githubusercontent.com/thewh1teagle/espeakng-loader/main/LICENSE",
     "MIT License", "a25f04c253370d0abaf0ace47bfb81c04ff5baec84787b8845c323d2f3aba05e"),
    ("espeak-ng-GPL-3.0.txt",
     "https://raw.githubusercontent.com/espeak-ng/espeak-ng/master/COPYING",
     "GNU GENERAL PUBLIC LICENSE", "c3bc1fd94148c28485e8bab1d5a28edbc8e3870f2bd9be7127c68c8b7a0ea5df"),
)


def espeak_upstream_license_evidence(notices: list[dict], evidence: Path) -> list[str] | None:
    """Accept only both already-fetched official, intact MIT and GPL notice texts."""
    verified_files = []
    for filename, official_url, marker, normalized_sha256 in ESPEAK_UPSTREAM_NOTICE_SPECS:
        relative = "licenses/upstream/" + filename
        matches = [row for row in notices if row.get("file") == relative
                   and row.get("source_url") == official_url]
        if len(matches) != 1 or not re.fullmatch(r"[0-9a-f]{64}", matches[0].get("sha256", "")):
            return None
        try:
            path = evidence / relative
            raw = path.read_bytes()
            text = raw.decode("utf-8")
        except (OSError, UnicodeError):
            return None
        if hashlib.sha256(raw).hexdigest() != matches[0]["sha256"]:
            return None
        if marker not in text or "<html" in text[:200].lower():
            return None
        if hashlib.sha256(text.strip().encode("utf-8")).hexdigest() != normalized_sha256:
            return None
        verified_files.append(relative)
    return verified_files


def verified_installed_license_text(row: dict, evidence: Path) -> bool:
    """Check the actual retained full notice file, never a metadata length alone."""
    license_root = (evidence / "licenses").resolve()
    for record in row.get("notice_files", []):
        try:
            relative = Path(record["file"])
            if relative.is_absolute() or ".." in relative.parts:
                continue
            path = (license_root / relative).resolve()
            if license_root not in path.parents or not path.is_file():
                continue
            raw = path.read_bytes()
            if len(raw) < 200 or hashlib.sha256(raw).hexdigest() != record.get("sha256"):
                continue
            text = raw.decode("utf-8").lower()
            if "<html" in text[:200]:
                continue
            if any(marker in text for marker in ["permission is hereby granted", "redistribution and use", "gnu general public license", "apache license"]):
                return True
        except (KeyError, OSError, UnicodeError, TypeError):
            continue
    return False


def validate_primary_license_text(inventory: list[dict], notices: list[dict], evidence: Path) -> list[dict]:
    """Keep the normal gate; narrowly allow the proven espeakng-loader exception."""
    missing, fallbacks = [], []
    for row in inventory:
        name = canonical(row["name"])
        if name not in PINS or verified_installed_license_text(row, evidence):
            continue
        files = None
        if name == "espeakng-loader" and row.get("version") == "0.2.4":
            files = espeak_upstream_license_evidence(notices, evidence)
        if files:
            fallbacks.append({"name": name, "version": row["version"],
                              "basis": "official MIT wrapper notice plus eSpeak GPL notice; both full texts hash-verified",
                              "files": files})
        else:
            missing.append(name)
    if missing:
        raise GateError("primary_dependency_license_text_missing:" + ",".join(missing))
    return fallbacks


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence-dir", default=os.environ.get("MEDIA_EVIDENCE_DIR", "artifacts/media-evidence"))
    args = parser.parse_args()
    if os.environ.get("GITHUB_ACTIONS") != "true":
        raise GateError("runner_required_no_local_downloads")
    model_env = os.environ.get("KOKORO_MODEL_DIR")
    if not model_env:
        raise GateError("KOKORO_MODEL_DIR_required")
    if sys.version_info[:2] not in {(3, 11), (3, 12)}:
        raise GateError("python_3_11_or_3_12_required")
    model_dir, evidence = Path(model_env), Path(args.evidence_dir)
    evidence.mkdir(parents=True, exist_ok=True)
    gate = evidence / "media-ready.json"
    gate.unlink(missing_ok=True)  # A failed rerun must not retain a stale success.
    runtime = verify_runtime()
    upstream = evidence / "licenses" / "upstream"
    notices = []
    # License evidence is retrieved before model downloads or any inference use.
    for filename, url, marker in LICENSE_SOURCES:
        path = upstream / filename
        try:
            digest = fetch(url, path)
        except GateError as error:
            raise GateError("license:" + filename + ":" + str(error)) from None
        text = path.read_text(encoding="utf-8")
        if marker.lower() not in text.lower() or "<html" in text[:200].lower():
            raise GateError("license_content_invalid:" + filename)
        notices.append({"file": str(path.relative_to(evidence)), "source_url": url, "sha256": digest})
    inventory = license_inventory(evidence / "licenses")
    (evidence / "installed-distributions.json").write_text(json.dumps(inventory, indent=2) + "\n")
    # An espeakng-loader wheel lacking notices may use the exact official pair.
    # This is not a whole-stack MIT declaration; GPL evidence remains mandatory.
    license_fallbacks = validate_primary_license_text(inventory, notices, evidence)
    save_freeze(evidence / "pip-freeze.txt")
    verified = []
    for asset in ASSETS:
        if not asset.get("sha256"):
            raise GateError("asset_expected_sha256_required")
        url = RELEASE + asset["filename"]
        try:
            digest = fetch(url, model_dir / asset["filename"], expected_hash=asset["sha256"],
                           expected_bytes=asset["bytes"], maximum=asset["bytes"])
        except GateError as error:
            raise GateError("asset:" + asset["filename"] + ":" + str(error)) from None
        verified.append({**asset, "source_url": url, "verified_sha256": digest, "locally_verified": True})
    report = {"status": "media_dependencies_ready_not_inference_tested", "verified_at_utc": datetime.now(timezone.utc).isoformat(),
              "runtime": runtime, "assets": verified, "selected_voice": "af_heart", "language": "en-us",
              "upstream_notices": notices, "installed_distributions": len(inventory),
              "license_fallbacks": license_fallbacks,
              "license_note": "Kokoro weights Apache-2.0; runtime wrapper MIT; phonemizer/eSpeak GPL notices retained; dependencies have individual licenses.",
              "reproducibility_note": "Primary versions and binary assets pinned. pip-freeze captures resolved transitive versions; keep pip install --report for wheel hashes. No claim of full pre-resolved dependency lock.",
              "distribution_note": "Model cache and installed environment are runner inputs, not publication artifacts. Notice collection is not permission to redistribute dependency binaries."}
    gate.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "assets_verified": len(verified), "distributions_recorded": len(inventory)}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except GateError as error:
        print(json.dumps({"status": "blocked", "reason": str(error)}), file=sys.stderr)
        raise SystemExit(2)
    except Exception as error:
        # Do not dump exception URLs, signed redirects, credentials or local paths.
        print(json.dumps({"status": "blocked", "reason": "unexpected_" + type(error).__name__}), file=sys.stderr)
        raise SystemExit(2)
