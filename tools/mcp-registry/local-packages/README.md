# Local MCP packages

The reviewed package list is `packages.json`. This builds three self-contained
Node MCP Bundles; it does not change the underlying product functions. FilingLens
and TradeCheck retain their existing free beta evaluation licenses. EcoBack is
copied from a full pinned commit of its public source repository and retains its
license. Calculators run locally; EcoBack weather and guide tools may read public
services when a user invokes them.

```sh
node tools/mcp-registry/build-local.mjs --output /tmp/fleet-mcp-bundles --release-tag fleet-mcp-registry-2026-10-10 --repository f-tiger/agi-site
node tools/mcp-registry/local-packages/smoke.mjs --output /tmp/fleet-mcp-bundles
```

Build requirements: Node 22+, npm, Python 3, Git, and network access to npm and
GitHub. It installs no global packages, executes no dependency lifecycle scripts,
and copies only explicitly allowed source paths. Production dependencies and a
lockfile are included in each archive. No credentials or source checkout `.git`
directories enter the bundle. The independent smoke command extracts the final
ZIPs, verifies their SHA-256, initializes the stdio servers, lists their tools,
and evaluates fictional or fixed calculator inputs with network calls blocked.

Output contract:

- `artifacts/*.mcpb`: deterministic ZIP files with root `manifest.json` (MCPB 0.3),
  runtime configuration, source provenance, production dependencies and licenses.
- `artifacts/SHA256SUMS`: checksums for the release assets.
- `servers/*.json`: official Registry documents using immutable GitHub release
  URLs and the exact `fileSha256`, transport `stdio`, Registry schema 2025-12-11.
- `build-index.json`: array of `{id,name,version,artifact,fileSha256,serverFile,
  identifier,toolNames,sourceRevision}`; file paths are absolute.
- `smoke-results.json`: final archive protocol and fixture verification results.

The publisher must upload the exact tested archives before submitting the
Registry documents. Never replace an asset already referenced by a registered
version. Use a new package version and immutable release tag for changed content.
To check repeatability, build into a second output directory at the same source
commit and compare both `artifacts/SHA256SUMS` files. Local product sources are
archived from pinned Git subtree hashes; an unrelated workflow/documentation
commit cannot change bundle provenance or checksums. Changed product trees fail
the build until the source pins and package versions are explicitly reviewed.

Specification sources checked for this implementation:

- https://github.com/anthropics/mcpb/blob/main/MANIFEST.md
- https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md
