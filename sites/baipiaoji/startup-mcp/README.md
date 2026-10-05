# BPJ Startup Research MCP

Remote Streamable HTTP endpoint: https://baipiaoji.com/api/startup-mcp

Documentation and installation: https://baipiaoji.com/en/ai-solo/mcp/

`startup_preview`, protocol initialization and tool discovery need no key. `search_startup_cases`, `compare_startup_cases`, `get_startup_radar` and `build_startup_plan` require an active existing BPJ membership (9 USDT / 30 days, matching decimal and network fees shown at checkout) and a scoped `bpj_solo_` key from the private member portal. No automatic renewal or overage billing. Maximum 100 member calls per UTC day and 10 per minute, shared across all keys.

Download a private MCP client configuration from https://baipiaoji.com/members#startup-mcp after signing in. A keyless template is available at https://baipiaoji.com/startup-mcp-config.json. Use clients supporting custom Authorization headers; OAuth-only clients are not supported. Never supply your main member access key to an MCP client.

```json
{
  "mcpServers": {
    "bpj-startup": {
      "url": "https://baipiaoji.com/api/startup-mcp",
      "headers": {"Authorization": "Bearer YOUR_SCOPED_MCP_KEY"}
    }
  }
}
```

Example sequence: search selfie skincare cases, compare 2–4 reviewed cases for the same customer job, then build a plan with your question, skills, customer, budget and available hours. Empty results remain empty; source periods, team scope, uncertainties and negative evidence stay attached.

MCP inputs reach BPJ for execution, are not stored in the database or added to training, and are not sent to external models. Host-model costs are separate. Keep customer secrets out of requests. Public web consultation and source-linked data remain free; membership buys hosted tool service, not exclusive rights to public data. Popularity does not establish revenue, and revenue does not establish profit. No payments, outreach or site changes are performed by these tools.

Official registry manifest: `server.json`, namespace `io.github.f-tiger/bpj-startup-research`. A dedicated registration workflow checks live protocol behavior before using GitHub OIDC to register a new version. It runs after successful BPJ deployments or registry configuration changes, has bounded network retries and can be retried without redeploying the site. Read the actual registry response before claiming registration or downstream marketplace indexing.

Tests: `node scripts/test-startup-mcp.mjs`, `node scripts/test-startup-mcp-browser.mjs`, and `node scripts/test-startup-mcp-live.mjs` from the BPJ site directory. Paid-flow tests use SQLite and fixture memberships, not real payments.
