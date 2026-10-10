# Fleet MCP registration

This directory registers existing fleet MCP implementations in the official
MCP Registry. It does not deploy websites, enable paid features, add scheduled
jobs or send directory submissions/messages.

The remote manifests cover the ten scoped Web3 servers and BPJ's free AI tool
server. The Web3 hub, BPJ main/startup servers and the other previously listed
servers retain their existing records and publication workflows. BPJ Pro is
excluded: its metadata request returned `503 paid_mcp_not_launched` on
2026-10-10. Do not list it as available or change its launch flag to pass this
workflow.

FilingLens, TradeCheck and the EcoBack local tool variant are distributed as
MCPB Node bundles. Local execution is separate from the existing remote ECO
service; the local variant's tool set and delivery differ. Package installation
and a registry listing do not establish genuine customers or successful usage.

## Verification and publication

On a pull request the workflow validates manifests, checks live `initialize`
and `tools/list` responses, builds the local bundles and checks their protocol.
It never sends `tools/call` to the public remote services. Local synthetic
checks use no private inputs or live model calls.

On `main`, two independent paths run:

1. Remote manifests publish through GitHub OIDC after metadata validation.
2. Local bundles are released as immutable GitHub assets, downloaded and hashed,
   then registered with exact URLs and SHA256 hashes.

Only the release job receives `contents: write`; only registry jobs receive
`id-token: write`. The publisher binary is pinned to v1.8.1 with its release
SHA256. There is no long-lived Registry credential and no cron trigger.

`registry.py` first checks the exact name/version. An existing matching active
record is success; a mismatching endpoint, artifact hash or version is a
failure. Each item gets a receipt, and one failed registration does not stop
the rest from being attempted. Workflow artifacts retain the readback records.
Release retries must reuse identical bytes: existing assets are never replaced.
Change package versions and the release tag deliberately when artifact content
changes.

Commands from the repository root:

```sh
python -m unittest discover -s tools/mcp-registry -p test_registry.py
python tools/mcp-registry/registry.py validate
python tools/mcp-registry/registry.py live
node tools/mcp-registry/build-local.mjs --output /tmp/fleet-mcp-bundles --release-tag fleet-mcp-registry-2026-10-10 --repository f-tiger/agi-site
python tools/mcp-registry/registry.py validate --manifest-dir /tmp/fleet-mcp-bundles/servers
```

Sources: [official server schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json),
[GitHub OIDC](https://modelcontextprotocol.io/registry/github-actions),
[MCPB packages](https://modelcontextprotocol.io/registry/package-types).
