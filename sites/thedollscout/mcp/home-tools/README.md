# The Doll Scout Home Tools

Connect an MCP client over Streamable HTTP at [https://thedollscout.com/api/home-mcp](https://thedollscout.com/api/home-mcp). Home Tools uses public manufacturer evidence and calculations on supplied values. The public endpoint requires no TDS API key.

Call `tools/list` and pass each returned `nextCursor` into the next request. The directory has 1,000 callable tools on 25 pages. Each tool supplies its input schema and a link to its browser page. Send `en`, `de` or `zh` in `params._meta["tds/locale"]` to select a response language.

Claude Code users can connect with:

```sh
claude mcp add --transport http tds-home-tools https://thedollscout.com/api/home-mcp
claude mcp get tds-home-tools
```

Run the official SDK verification from the repository root with Node 24:

```sh
npm ci --prefix sites/thedollscout/mcp --ignore-scripts
npm run --prefix sites/thedollscout/mcp verify:home-local
npm run --prefix sites/thedollscout/mcp verify:home-live
```

Both commands enumerate every tool and run three public examples through the actual MCP transport. They also verify the existing collecting endpoint and one of its tools. The local check uses a temporary loopback HTTP server without the event store. The production check uses QA request markers for both endpoints.

The official MCP Registry record uses the name `io.github.f-tiger/tds-home-tools` and the Streamable HTTP endpoint. After a site release passes, the opt-in `[tds-home-mcp-publish]` job reads back the production tool definitions, runs the SDK checks and publishes the exact version with GitHub OIDC. The workflow retains a Registry receipt. The collecting endpoint at [/mcp](https://thedollscout.com/mcp) keeps its own Registry record and documented connection.

Browser directory [English](https://thedollscout.com/ai-tools) · [Deutsch](https://thedollscout.com/de/ai-tools) · [中文](https://thedollscout.com/zh/ai-tools)
