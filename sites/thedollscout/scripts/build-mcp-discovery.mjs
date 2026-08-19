/* Publishes the MCP endpoint's discovery surfaces, generated from the tool
   list itself so a description cannot drift from what the server does.

   Three surfaces, and they are honestly different in weight:

     server.json            — the format the OFFICIAL registry consumes
                              (registry.modelcontextprotocol.io). This is the
                              one that leads to real, automatic discovery:
                              publish it and clients find the server through
                              the registry rather than through us telling
                              them.
     /.well-known/mcp.json  — a DIFFERENT thing: a proposed discovery
                              convention that is still unshipped. Kept because
                              the cost is one small file, but it is not the
                              registry path and should not be mistaken for it.
     llms.txt               — AI crawlers already fetch this. A model reading
                              it should learn the tools can be CALLED, not
                              just that the data can be read.
     JSON-LD WebAPI         — on the docs page, for ordinary extractors.

   What this does NOT do is submit to third-party registries. That is
   outward-facing publication to somebody else's service under the owner's
   name, and it needs their account and their decision. The payload is
   generated for them; sending it is theirs. */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://thedollscout.com";

/* Parsed from the endpoint rather than restated, so the discovery documents
   describe the tools that actually exist. */
const src = readFileSync("functions/mcp.js", "utf8");
const block = src.slice(src.indexOf("const TOOLS = ["), src.indexOf("\n];", src.indexOf("const TOOLS = [")) + 3);
const TOOLS = eval(block.replace("const TOOLS =", "(") .replace(/;\s*$/, ")"));

if (!Array.isArray(TOOLS) || !TOOLS.length) {
  console.error("Could not read the tool list out of functions/mcp.js — refusing to publish a discovery file that describes nothing.");
  process.exit(1);
}

mkdirSync(".well-known", { recursive: true });
writeFileSync(
  ".well-known/mcp.json",
  JSON.stringify(
    {
      name: "dollscout",
      description:
        "Recorded adult-doll specification data, UK payment-recourse rules and a first-year ownership cost model, " +
        "exposed as callable tools. Every answer is read from the site's published datasets at request time and " +
        "carries their recording date and stated limitations.",
      version: "1.0.0",
      endpoint: `${SITE}/mcp`,
      transport: "streamable-http",
      authentication: "none",
      documentation: `${SITE}/mcp`,
      license: "https://creativecommons.org/licenses/by/4.0/",
      contentRating: "adult",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
    null,
    2
  ) + "\n"
);

/* The submission payload for a human to send, not for us to send. */
mkdirSync("content", { recursive: true });
writeFileSync(
  "content/mcp-registry-submission.md",
  `# MCP registry listing — automated, waiting on one secret

An earlier version of this file said registry listing could not be automated.
That was wrong. The official registry proves domain ownership over HTTP: it
fetches a public key from /.well-known/mcp-registry-auth and verifies a
signature made with the matching private key. We control both.

So the mechanism is built and automatic. What is not automated is the
DECISION, and there is exactly one switch:

**Add repository secret \`MCP_REGISTRY_PRIVATE_KEY\`.** That is the go-ahead.
The next deploy serves the proof, and .github/workflows/mcp-publish.yml lists
the server. Nothing goes public before that, and nothing publishes by default.

Generate the key yourself — it must not pass through a chat transcript or a
build log:

    openssl genpkey -algorithm ed25519 -out mcp-key.pem

**Endpoint:** ${SITE}/mcp
**Docs:** ${SITE}/mcp
**Discovery:** ${SITE}/.well-known/mcp.json
**Auth:** none
**Transport:** streamable HTTP (JSON-RPC POST)
**Content rating:** adult — several registries require this to be declared, and
some will not accept an adult-category server at all. Check before submitting
rather than after.

## Tools

${TOOLS.map((t) => `- \`${t.name}\` — ${t.description}`).join("\n")}

## Before you add the secret

- The endpoint returns no affiliate links and no vendor ranking. Keep it that
  way; a registry listing that turns out to be a referral funnel is the fastest
  way to be delisted, and it would contradict the whole positioning.
- Registries generally want a stable URL. This one is stable, but the data
  behind it is re-recorded weekly — the answers carry their date, so a stale
  cache on their side is visible rather than silent.
`
);

/* The format the official registry actually consumes. The publisher CLI
   validates it on publish, which is the real check — this only guarantees the
   tool list matches the server, which is the part that could silently rot. */
writeFileSync(
  "server.json",
  JSON.stringify(
    {
      $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
      /* Domain namespace, not io.github.* — ownership is proved by the key
         served at /.well-known/mcp-registry-auth, which the deploy publishes
         from the private key held as a secret. */
      name: "com.thedollscout/dollscout",
      description:
        "Recorded adult-doll specification data, UK payment-recourse rules and a first-year ownership cost " +
        "model as callable tools. Answers are read from published datasets at request time and carry their " +
        "recording date and stated limitations. 18+ / adult category.",
      version: "1.0.0",
      websiteUrl: `${SITE}/mcp`,
      remotes: [{ type: "streamable-http", url: `${SITE}/mcp` }],
    },
    null,
    2
  ) + "\n"
);

console.log(`server.json: com.thedollscout/dollscout → ${SITE}/mcp`);
console.log(`.well-known/mcp.json: ${TOOLS.length} tools (proposed convention, not the registry path)`);
console.log("content/mcp-registry-submission.md: payload written for a human to send");
