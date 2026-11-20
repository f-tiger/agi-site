# EcoBack local MCP bundle

The existing official Registry identity `io.github.f-tiger/ecoback-local-tools`
uses the public EcoBack stdio implementation as an installable MCPB. The
bundle documents Node.js 22 or later and loads its tool catalogue dynamically.
Calculations and reviewed device checks run on the user's device. Weather and
some guide lookups use public endpoints when requested.

Version 1.17.0 retains the eight supported legacy tool names with their
existing input schemas. The old `balkonspeicher_foerderung` tool was removed
with the balcony-storage product scope. The public source and offline
installation instructions are in the companion repository.

https://github.com/f-tiger/getecoback-mcp

Build with Node.js 22 or later and Python 3. The builder archives the pinned
companion commit from the supplied Git checkout and exercises actual MCP
stdio calls from the extracted artifact with network disabled.

```sh
node tools/eco-local-mcpb/build.mjs /path/to/getecoback-mcp /path/to/empty-output
```

The `Build and register the EcoBack local MCP bundle` workflow verifies the archive in
pull requests. Its manual main-branch publication uploads a versioned asset
to the existing fleet release, verifies the public bytes and reads back the
official local Registry record. Runtime source updates require a new
bundle version and a matching source pin.
