"""Exercise the real daily commit handoff against an isolated local bare remote."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

source = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(prefix="tds-persist-") as directory:
    base = Path(directory)
    work = base / "work"
    remote = base / "remote.git"
    work.mkdir()

    def run(*args, cwd=work, env=None):
        result = subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        return result.stdout.strip()

    run("git", "init", "--bare", str(remote))
    run("git", "init", "-b", "main")
    run("git", "config", "user.name", "Test")
    run("git", "config", "user.email", "test@example.invalid")
    run("git", "remote", "add", "origin", str(remote))
    (work / "scripts").mkdir()
    shutil.copy(source / "scripts/commit-generated.sh", work / "scripts/commit-generated.sh")
    for name in ["content/series-state.json", "collector-assets/series-catalog.json",
                 "collector-assets/tool-capabilities.json", "llms.txt", "llms-full.txt",
                 "sitemap.xml", "scripts/urls.txt"]:
        file = work / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text("{}\n")
    (work / "collector-assets/manifest.json").write_text(json.dumps({"records": []}))
    (work / "other-generated.html").write_text("checked-in output\n")
    run("git", "add", ".")
    run("git", "commit", "-m", "baseline")
    run("git", "push", "-u", "origin", "main")
    (work / "content/series-state.json").write_text('{"changed":true}\n')
    # This is the production failure: the document build rewrites tracked files
    # that intentionally do not belong to the series bot's commit allowlist.
    (work / "other-generated.html").write_text("fresh build output\n")
    (work / "do-not-stage.txt").write_text("untouched")
    env = {**os.environ, "GITHUB_ENV": str(base / "env")}
    script = str(source / "scripts/collecting/commit-daily.mjs")
    run("node", script, env=env)
    head = run("git", "rev-parse", "HEAD")
    assert head == run("git", "--git-dir=" + str(remote), "rev-parse", "main")
    assert run("git", "diff", "--name-only") == "other-generated.html"
    assert run("git", "ls-files", "--others", "--exclude-standard") == "do-not-stage.txt"
    assert (work / "other-generated.html").read_text() == "fresh build output\n"
    assert run("git", "show", "HEAD:other-generated.html") == "checked-in output"
    assert run("git", "diff-tree", "--no-commit-id", "--name-only", "-r", head) == "content/series-state.json"
    assert "TDS_DAILY_AFTER=" + head in (base / "env").read_text()
    run("node", script, env=env)
    assert run("git", "rev-parse", "HEAD") == head

    # Refuse to sweep somebody else's staged changes into the bot commit.
    (base / "env").unlink()
    run("git", "add", "other-generated.html")
    try:
        run("node", script, env=env)
        raise AssertionError("Unrelated staged files must block the source commit")
    except RuntimeError as error:
        assert "Unrelated staged files" in str(error)
    assert run("git", "rev-parse", "HEAD") == head
    assert not (base / "env").exists()
    run("git", "restore", "--staged", "other-generated.html")

    other = base / "other"
    run("git", "clone", "--branch", "main", str(remote), str(other))
    run("git", "config", "user.name", "Other", cwd=other)
    run("git", "config", "user.email", "other@example.invalid", cwd=other)
    (other / "unrelated.txt").write_text("concurrent work")
    run("git", "add", ".", cwd=other)
    run("git", "commit", "-m", "concurrent work", cwd=other)
    run("git", "push", cwd=other)
    (work / "content/series-state.json").write_text('{"changed":"again"}\n')
    try:
        run("node", script, env=env)
        raise AssertionError("Concurrent main must stop the stale release")
    except RuntimeError as error:
        assert "refusing stale build" in str(error)
    assert (work / "unrelated.txt").read_text() == "concurrent work"
    assert (work / "other-generated.html").read_text() == "fresh build output\n"
    assert not (base / "env").exists()

    # A clean remote rebase can succeed while restoring the local build output
    # conflicts. Git returns zero for that shape, so the caller must detect it.
    run("git", "pull", "--rebase", cwd=other)
    (other / "other-generated.html").write_text("new main output\n")
    run("git", "add", "other-generated.html", cwd=other)
    run("git", "commit", "-m", "change generated output on main", cwd=other)
    run("git", "push", cwd=other)
    (work / "content/series-state.json").write_text('{"changed":"conflict case"}\n')
    try:
        run("node", script, env=env)
        raise AssertionError("Autostash restoration conflicts must stop deployment")
    except RuntimeError as error:
        assert "Build-output conflict" in str(error)
    assert run("git", "diff", "--name-only", "--diff-filter=U") == "other-generated.html"
    assert run("git", "--git-dir=" + str(remote), "show", "main:other-generated.html") == "new main output"
    assert not (base / "env").exists()
    print("Native persistence: scoped push, tracked-output preservation, no-op retry, staged-file isolation, exact SHA and concurrent/conflicted-main protection passed.")
