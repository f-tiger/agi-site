#!/usr/bin/env python3
"""MCPB is a ZIP archive: sorted paths, fixed timestamps, permissions and compression."""
import pathlib
import stat
import sys
import zipfile

source, target = map(pathlib.Path, sys.argv[1:])
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(source.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Unexpected symlink in bundle: {path.relative_to(source)}")
        if not path.is_file():
            continue
        name = path.relative_to(source).as_posix()
        if any(part in {".git", ".env", ".npmrc", ".mcpregistry_github_token", ".mcpregistry_github_token.txt"} for part in path.relative_to(source).parts):
            raise ValueError(f"Private or repository-only file in bundle: {name}")
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = (stat.S_IFREG | 0o644) << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
