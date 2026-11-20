# EcoBack local MCP bundle

The existing official Registry identity `io.github.f-tiger/ecoback-local-tools`
uses the public EcoBack stdio implementation as an installable MCPB. The
bundle documents Node.js 22 or later and loads its tool catalogue dynamically.
Calculations and reviewed device checks run on the user's device. Weather and
some guide lookups use public endpoints when requested.

Version 1.17.1 includes offline search and reviewed sample runs from the
extracted bundle. It retains the 2,003 callable names and eight supported legacy
tool schemas from 1.17.0. The public source and offline installation instructions
are in the companion repository.

https://github.com/f-tiger/getecoback-mcp

Build with Node.js 22 or later and Python 3. The builder archives the pinned
companion commit from the supplied Git checkout and exercises actual MCP
stdio calls, finder queries and reviewed examples from the extracted artifact
with network disabled.

```sh
node tools/eco-local-mcpb/build.mjs /path/to/getecoback-mcp /path/to/empty-output
```

The `Build and register the EcoBack local MCP bundle` workflow verifies the archive in
pull requests. Its manual main-branch publication uploads a versioned asset
to the existing fleet release, verifies the public bytes and reads back the
official local Registry record. Runtime source updates require a new
bundle version and a matching source pin.
