# EcoBack local MCP bundle

The existing official Registry identity `io.github.f-tiger/ecoback-local-tools`
uses the public EcoBack stdio implementation as an installable MCPB. The
bundle documents Node.js 22 or later and loads its tool catalogue dynamically.
Calculations and reviewed device checks run on the user's device. Weather and
some guide lookups use public endpoints when requested.

Version 1.17.1 includes offline search and reviewed sample runs from the
extracted bundle. It retains the 2,003 callable names and eight supported legacy
tool schemas from 1.17.0. Version 1.17.2 adds an optional compact stdio profile.
The MCPB installs with the full catalogue by default. The public source and
offline installation instructions are in the companion repository.

https://github.com/f-tiger/getecoback-mcp

To use the compact profile, extract the `.mcpb` archive into its own directory.
Run `node src/server.mjs --compact` from that directory, or configure a manual
stdio entry in a client that supports `mcpServers`. Use the absolute path to the
extracted server.

```json
{
  "mcpServers": {
    "ecoback-compact": {
      "command": "node",
      "args": ["/absolute/path/to/extracted-bundle/src/server.mjs", "--compact"]
    }
  }
}
```

The compact profile lists `ecoback_werkzeug_finden` and
`ecoback_werkzeug_ausfuehren`. Start with the finder, then pass a result's tool
name and your inputs to the runner. Compact calls are limited to offline tools.

Version 1.17.3 adds one German-language evidence resource to both profiles.
Use `resources/list` in an MCP client that supports resources, then read
`ecoback://evidence/de/kellerentfeuchter` with `resources/read`. The bundled
Markdown covers cold-cellar performance at stated test conditions, model-specific
drainage and when to measure or look for the moisture source before buying.

Version 1.17.4 improves discovery for German questions about the cost per load
of a tumble dryer versus a dehumidifier. The extracted compact package finds
the measured-cost tool and runs its cited example. At €0.30 per kWh, readings
of 2 kWh and 1 kWh give €0.60 and €0.30 per load. The comparison remains open
if the loads reach different levels of dryness.

Version 1.17.5 keeps that comparison available while avoiding an automatic
first-place match for questions about both devices running together or using
only the dryer. The extracted compact package checks both cases.

The builder replaces only the source README's versioned download and checksum
paragraphs in **Connect** with instructions for running the already extracted
files and a link to the official Registry's latest record. The remainder of the
README, the license and the exact source revision are preserved. The build
checks the extracted archive for the old download URL, exact Registry link and
checksum so the new archive carries none of those pointers.

Build with Node.js 22 or later and Python 3. The builder archives the pinned
companion commit from the supplied Git checkout and exercises actual MCP
stdio calls, finder queries and reviewed examples from the extracted artifact
with network disabled. The build receipt includes the compact list, a finder
result, execution of its reviewed example, retained citations, and rejection of
a live-only tool. It also verifies identical resource contents in both profiles
and the compact finder’s relevant answer, plus the error returned for an unknown
resource URI.

```sh
node tools/eco-local-mcpb/build.mjs /path/to/getecoback-mcp /path/to/empty-output
```

The `Build and register the EcoBack local MCP bundle` workflow verifies the archive in
pull requests. Its manual main-branch publication uploads a versioned asset
to the existing fleet release, verifies the public bytes and reads back the
official local Registry record. Runtime source updates require a new
bundle version and a matching source pin.
