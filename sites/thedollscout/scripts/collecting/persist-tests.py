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
    run("git", "add", ".")
    run("git", "commit", "-m", "baseline")
    run("git", "push", "-u", "origin", "main")
    (work / "content/series-state.json").write_text('{"changed":true}\n')
    (work / "do-not-stage.txt").write_text("untouched")
    env = {**os.environ, "GITHUB_ENV": str(base / "env")}
    script = str(source / "scripts/collecting/commit-daily.mjs")
    run("node", script, env=env)
    head = run("git", "rev-parse", "HEAD")
    assert head == run("git", "--git-dir=" + str(remote), "rev-parse", "main")
    assert run("git", "status", "--short") == "?? do-not-stage.txt"
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
    assert (work / "unrelated.txt").read_text() == "concurrent work"
    assert not (base / "env").exists()
    print("Native persistence: scoped push, no-op retry, exact SHA and concurrent-main protection passed.")
