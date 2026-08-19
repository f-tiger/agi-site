/* Publishes the domain-ownership proof the official MCP registry checks.

   Correcting an earlier assumption in this repo: registry listing IS
   automatable. The registry verifies domain ownership by fetching

       https://<domain>/.well-known/mcp-registry-auth

   and reading a public key from it, then verifying a signature made with the
   matching private key. We control the domain and the deploy, so the proof
   can publish itself. The earlier ".well-known/mcp.json" file was a guess at
   a DIFFERENT thing — a proposed discovery convention that is still
   unshipped. It is kept, labelled as such, and is not this.

   The private key never enters the repository. It arrives as a GitHub Secret
   and the PUBLIC half is derived from it here, at build time, so the served
   file cannot drift from the key that actually signs. Deriving rather than
   storing both also means there is no second value to get out of sync.

   Without the secret this writes nothing and prints the setup. It does not
   fail the build: a site that has not opted into a registry is not broken. */

import { createPrivateKey, createPublicKey } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";

const OUT = ".well-known/mcp-registry-auth";
const KEY = process.env.MCP_REGISTRY_PRIVATE_KEY;

if (!KEY) {
  /* Remove a stale proof rather than leaving one that no key can sign for —
     a well-known file advertising a key we no longer hold is worse than
     none, because the failure surfaces at publish time as a signature
     mismatch rather than as an obviously missing file. */
  if (existsSync(OUT)) {
    unlinkSync(OUT);
    console.log(`Removed ${OUT}: no MCP_REGISTRY_PRIVATE_KEY, so nothing can sign for it.`);
  }
  console.log(
    "MCP registry publishing is not configured. To turn it on:\n" +
    "\n" +
    "  1. Generate a keypair (run this yourself — the private key must never\n" +
    "     pass through a chat transcript or a build log):\n" +
    "\n" +
    "       openssl genpkey -algorithm ed25519 -out mcp-key.pem\n" +
    "       openssl pkey -in mcp-key.pem -noout -text | grep -A3 priv\n" +
    "\n" +
    "     or, hex form for the publisher CLI:\n" +
    "       openssl genpkey -algorithm ed25519 | openssl pkey -text -noout\n" +
    "\n" +
    "  2. Add the private key as repository secret MCP_REGISTRY_PRIVATE_KEY\n" +
    "     (PEM, or 64-char hex seed).\n" +
    "\n" +
    "  3. That secret existing IS the go-ahead. The next deploy publishes the\n" +
    "     proof at /.well-known/mcp-registry-auth and the publish workflow\n" +
    "     lists the server. Nothing goes public until you add it.\n" +
    "\n" +
    "  Before you do: the registry lists this publicly as an adult-category\n" +
    "  server. Check that its policies accept one — that is cheaper to find\n" +
    "  out before a listing than after."
  );
  process.exit(0);
}

/* Accept either a PEM private key or a raw 32-byte hex seed, because the two
   tools involved disagree about which they hand you. */
let priv;
try {
  priv = KEY.includes("BEGIN")
    ? createPrivateKey(KEY)
    : createPrivateKey({
        key: Buffer.concat([
          Buffer.from("302e020100300506032b657004220420", "hex"), // PKCS#8 Ed25519 prefix
          Buffer.from(KEY.trim(), "hex"),
        ]),
        format: "der",
        type: "pkcs8",
      });
} catch (e) {
  console.error(`MCP_REGISTRY_PRIVATE_KEY is not a usable Ed25519 key: ${e.message}`);
  process.exit(1);
}

const raw = createPublicKey(priv).export({ format: "der", type: "spki" });
/* SPKI for Ed25519 is a 12-byte header followed by the 32-byte key. */
const pub = raw.subarray(raw.length - 32).toString("hex");

mkdirSync(".well-known", { recursive: true });
writeFileSync(OUT, `v=MCPv1; k=ed25519; p=${pub}\n`);
console.log(`${OUT}: published domain proof (public key ${pub.slice(0, 16)}…)`);
console.log("The private half stays in the secret; only the public half is served.");
