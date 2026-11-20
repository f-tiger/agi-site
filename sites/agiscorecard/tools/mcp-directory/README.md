# AGI MCP directory

`/agents/` and `/zh/agents/` share one dated public catalog. One row represents one MCP server. The native `search_mcp_catalog` tool reads the same artifact through the static assets binding.

The builder uses the existing publisher-link checks in the repository's BPJ agent-watch snapshot and the selected publisher resources in `featured.json`. Featured status records documentation review. Other rows pass the automated source, recency, deduplication and connection-metadata checks. Publisher descriptions and declared connection methods may change. The directory records the scope of each check, and the refresh leaves third-party runtime, credentials, permission checks and pricing to publisher documentation.

To refresh the committed snapshot, review the diff before publishing:

```bash
node sites/agiscorecard/tools/mcp-directory/build.mjs
node sites/agiscorecard/tools/mcp-directory/build.mjs --check
node sites/agiscorecard/tools/mcp-directory/build.mjs --validate
node --test sites/agiscorecard/tools/mcp-directory/search.test.mjs
```

Deployment validates the shipped artifact independently of BPJ refresh timing. The browser's directory search and external source clicks use fixed event names. The usage report at `/api/pulse` reports event counts. MCP search never records free-text arguments, and verification uses `__ci=1`.
