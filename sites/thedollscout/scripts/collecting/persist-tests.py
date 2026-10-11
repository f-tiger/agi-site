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
    # Keep the old helper available so this regression also reproduces on main.
    shutil.copy(source / "scripts/commit-generated.sh", work / "scripts/commit-generated.sh")
    for name in ["content/series-state.json", "collector-assets/series-catalog.json",
                 "collector-assets/tool-capabilities.json", "llms.txt", "llms-full.txt",
                 "sitemap.xml", "scripts/urls.txt"]:
        file = work / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text("{}\n")
    (work / "collector-assets/manifest.json").write_text(json.dumps({"records": []}))
    (work / "document-output.html").write_text("original document output")
    run("git", "add", ".")
    run("git", "commit", "-m", "baseline")
    run("git", "push", "-u", "origin", "main")
    (work / "content/series-state.json").write_text('{"changed":true}\n')
    (work / "do-not-stage.txt").write_text("untouched")
    (work / "document-output.html").write_text("validated generated document output")
    env = {**os.environ, "GITHUB_ENV": str(base / "env")}
    script = str(source / "scripts/collecting/commit-daily.mjs")
    run("node", script, env=env)
    head = run("git", "rev-parse", "HEAD")
    assert head == run("git", "--git-dir=" + str(remote), "rev-parse", "main")
    assert run("git", "status", "--porcelain").splitlines() == ["M document-output.html", "?? do-not-stage.txt"]
    assert (work / "document-output.html").read_text() == "validated generated document output"
    assert run("git", "show", "HEAD:document-output.html") == "original document output"
    assert "TDS_DAILY_AFTER=" + head in (base / "env").read_text()
    run("node", script, env=env)
    assert run("git", "rev-parse", "HEAD") == head

    other = base / "other"
    run("git", "clone", "--branch", "main", str(remote), str(other))
    run("git", "config", "user.name", "Other", cwd=other)
    run("git", "config", "user.email", "other@example.invalid", cwd=other)
    (other / "unrelated.txt").write_text("concurrent work")
    run("git", "add", ".", cwd=other)
    run("git", "commit", "-m", "concurrent work", cwd=other)
    run("git", "push", cwd=other)
    (work / "content/series-state.json").write_text('{"changed":"again"}\n')
    (base / "env").unlink()
    try:
        run("node", script, env=env)
        raise AssertionError("Concurrent main must stop the stale release")
    except RuntimeError as error:
        assert "refusing stale build" in str(error)
    assert not (work / "unrelated.txt").exists()
    assert run("git", "rev-parse", "HEAD") == head
    assert run("git", "--git-dir=" + str(remote), "rev-parse", "main") == run("git", "rev-parse", "HEAD", cwd=other)
    assert (work / "content/series-state.json").read_text() == '{"changed":"again"}\n'
    assert (work / "document-output.html").read_text() == "validated generated document output"
    assert not (base / "env").exists()
    # Start a fresh checkout for the race between the fetch and the push.
    race = base / "race"
    run("git", "clone", "--branch", "main", str(remote), str(race))
    (race / "content/series-state.json").write_text('{"race":true}\n')
    (race / "document-output.html").write_text("validated race output")
    # The pre-push hook emulates another contributor landing after preflight.
    hook = race / ".git/hooks/pre-push"
    hook.write_text("#!/bin/sh\nset -eu\n" +
                    "git -C '" + str(other) + "' commit --allow-empty -m race\n" +
                    "git -C '" + str(other) + "' push origin main\n")
    hook.chmod(0o755)
    try:
        run("node", script, cwd=race, env=env)
        raise AssertionError("Concurrent push must stop the stale release")
    except RuntimeError as error:
        assert "refusing stale build" in str(error)
    assert not (base / "env").exists()
    assert run("git", "--git-dir=" + str(remote), "rev-parse", "main") == run("git", "rev-parse", "HEAD", cwd=other)
    assert json.loads(run("git", "show", "HEAD:content/series-state.json", cwd=race)) == {"race": True}
    assert (race / "document-output.html").read_text() == "validated race output"
    assert run("git", "status", "--porcelain", cwd=race) == "M document-output.html"

    # Pre-staged unrelated work cannot be accidentally included in our commit.
    staged = base / "staged"
    run("git", "clone", "--branch", "main", str(remote), str(staged))
    (staged / "do-not-commit.txt").write_text("other contributor work")
    run("git", "add", "do-not-commit.txt", cwd=staged)
    staged_head = run("git", "rev-parse", "HEAD", cwd=staged)
    try:
        run("node", script, cwd=staged, env=env)
        raise AssertionError("Existing staged work must remain untouched")
    except RuntimeError as error:
        assert "nonempty or unreadable index" in str(error)
    assert run("git", "rev-parse", "HEAD", cwd=staged) == staged_head
    assert run("git", "diff", "--cached", "--name-only", cwd=staged) == "do-not-commit.txt"
    assert not (base / "env").exists()
    print("Native persistence: dirty generated outputs preserved, scoped push, no-op, exact SHA, concurrent build/push and staged-work guards passed.")
