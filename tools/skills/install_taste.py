#!/usr/bin/env python3
"""Install the reviewed Taste package locally, without running upstream scripts."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

REPO = Path(__file__).resolve().parents[2]
COMMIT = "9b4bf937a1f69348126959c15d2f99a73e65699b"
UPSTREAM = "https://github.com/Leonxlnx/taste-skill.git"
DEST = REPO / ".claude/skills/design-taste-frontend"


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args], text=True).strip()


def hashes(root):
    result = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise RuntimeError(f"Unexpected symlink: {path}")
        if path.is_file() and path.name != "UPSTREAM.json":
            result[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def check():
    meta = json.loads((DEST / "UPSTREAM.json").read_text())
    if meta["commit"] != COMMIT or meta["files"] != hashes(DEST):
        raise RuntimeError("Installed package differs from the reviewed manifest; not overwriting it")
    print(f"Taste {meta['version']}: verified {len(meta['files'])} files at {DEST}")


def stage(source, staged, archive):
    # Read the pinned Git tree, not the working directory: ignored extras and
    # sparse-checkout omissions must never change the installed package.
    with archive.open("wb") as output:
        subprocess.run(["git", "-C", str(source), "archive", COMMIT,
                        "skills/taste-skill", "LICENSE"], stdout=output, check=True)
    staged.mkdir()
    with tarfile.open(archive) as bundle:
        for member in bundle:
            if member.isdir():
                continue
            if not member.isfile():
                raise RuntimeError(f"Unexpected archive entry: {member.name}")
            if member.name == "LICENSE":
                relative = Path("LICENSE")
            elif member.name.startswith("skills/taste-skill/"):
                relative = Path(member.name).relative_to("skills/taste-skill")
            else:
                raise RuntimeError(f"Unexpected archive path: {member.name}")
            if relative.is_absolute() or ".." in relative.parts:
                raise RuntimeError("Unsafe archive path")
            target = staged / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(bundle.extractfile(member).read())
    if not (staged / "SKILL.md").is_file():
        raise RuntimeError("The complete skill package is missing")


def install(source):
    if git(source, "rev-parse", "HEAD") != COMMIT:
        raise RuntimeError("Source checkout is not the reviewed commit")
    if git(source, "status", "--porcelain", "--untracked-files=all", "--", "skills/taste-skill", "LICENSE"):
        raise RuntimeError("Source package has local modifications")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".taste-install-", dir=DEST.parent) as temp:
        staged = Path(temp) / "package"
        stage(source, staged, Path(temp) / "upstream.tar")
        meta = {"repository": UPSTREAM, "commit": COMMIT, "version": "2.5.0", "files": hashes(staged)}
        (staged / "UPSTREAM.json").write_text(json.dumps(meta, indent=2) + "\n")
        if DEST.exists() or DEST.is_symlink():
            raise RuntimeError("Destination already exists; refusing to replace it")
        staged.rename(DEST)
    check()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="An existing clean checkout at the pinned commit")
    parser.add_argument("--check", action="store_true", help="Verify installed files without network access")
    args = parser.parse_args()
    if args.check or DEST.exists():
        check()
    elif args.source:
        install(args.source.resolve())
    else:
        with tempfile.TemporaryDirectory(prefix="taste-source-") as temp:
            source = Path(temp)
            git(source, "init", "--quiet")
            git(source, "remote", "add", "origin", UPSTREAM)
            git(source, "sparse-checkout", "init", "--cone")
            git(source, "sparse-checkout", "set", "skills/taste-skill")
            git(source, "fetch", "--quiet", "--depth=1", "--filter=blob:none", "origin", COMMIT)
            git(source, "checkout", "--quiet", "--detach", "FETCH_HEAD")
            install(source)


if __name__ == "__main__":
    main()
