#!/usr/bin/env python3
"""Materialize existing AGI sitemap inputs with the deployment's own builder.

Build in a throwaway directory: the builder also rewrites homepages and adds its
catalogue to a sitemap, neither of which this scanner is allowed to publish.
Copy only missing HTML already named by the site's original sitemap. Unknown
URLs remain unresolved so the normal max_unresolved=0 guard still fails.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile

import config
import pagemap


def copy_missing(cfg, generated_root):
    """Copy generated HTML for existing sitemap URLs; never overwrite a file."""
    generated = config.SiteConfig({**cfg.raw, "publish_root": str(generated_root)}, cfg.path)
    copied = []
    for url in pagemap.sitemap_urls(cfg):
        if cfg.rel_for_url(url) is not None:
            continue
        rel = generated.rel_for_url(url)
        if not rel or not rel.endswith((".html", ".htm")):
            continue
        source, target = Path(generated_root, rel), Path(cfg.publish_root, rel)
        # Neither sitemap paths nor Worker mappings may escape either root.
        for file, root in ((source, generated_root), (target, cfg.publish_root)):
            if not file.resolve().is_relative_to(Path(root).resolve()):
                raise config.ConfigError("generated input escapes publish root: %s" % rel)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive create also protects against replacing a pre-existing alias.
        with source.open("rb") as src, target.open("xb") as dst:
            shutil.copyfileobj(src, dst)
        copied.append(rel)
    return copied


def main():
    cfg = config.load("agiscorecard")
    with tempfile.TemporaryDirectory(prefix="autopilot-generated-") as out:
        subprocess.run(["node", "tools/revenue-studio/build.mjs", "--site", "agi", "--out", out],
                       cwd=config.REPO, check=True)
        copied = copy_missing(cfg, out)
    print("[agiscorecard] prepared %d existing sitemap HTML inputs" % len(copied))


if __name__ == "__main__":
    main()
