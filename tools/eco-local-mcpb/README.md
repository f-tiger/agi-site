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

Version 1.18.0 adds 11 checks for named German Kärcher and Bosch GlassVAC
models and brings the full catalogue to 2,014 callable names. Start with
“Passt die 170-mm-Abziehlippe 2.633-104.0 an meinen Kärcher WV 8 Signature
Line?” Use the actual model, nozzle and part number from the offer when
running the check. Equal blade widths alone do not establish compatibility.
The archive test runs all 11 reviewed examples, then checks the three possible
decisions for the WV 8 in compact mode with the German manufacturer's sources.

Version 1.19.0 adds a pane-width comparison for German window vacuum packages.
A 170 mm pane with 5 mm clearance per side leaves 160 mm for a nozzle. The
extracted package checks the matching Bosch article, an existing nozzle, an
unmeasured pane and a household that plans to keep its current equipment.

Version 1.20.0 adds three German household decisions. The archive verifies
the PortaSplit bracket for a roof window, the number of winter drying seasons
needed to recover a purchase, and the published Meaco Arete One 20L test
points at 10 °C and 20 °C with 60% relative humidity. It also checks the
answers for an unconfirmed model, incomplete electricity measurements and
unavailable Comfee test-point data.

Version 1.21.0 checks the exact Oventrop radiator valve and pitch against
tado° X documentation. The archive exercises the separate adapter for UniDH
and UniL, direct mounting for Vindo TH, and the advice to defer a purchase
when the valve identification, pitch or condition needs clarification.

Version 1.22.0 adds a German cost check for the De’Longhi PAC N90 ECO Silent
with EAN 8004399512351. At €0.30/kWh its 0.9 kWh EU label reference costs
€0.27 per standard hour. A measured 1.2 kWh over 90 minutes costs €0.36 for
that run. The archive checks both figures and the answers when identification,
tariff or full-run measurements are missing.

Version 1.22.1 adds copyable German results to the laundry-cost tool. Its
public calculator link carries no input values. The extracted archive checks
the wording when the loads are not confirmed comparable and the rounding of
1.4 kWh at €0.025/kWh to €0.04.

Version 1.22.2 helps German readers comparing the Beurer LB 55 and Stadler
Form Oskar find the existing humidifier efficiency tool. The extracted
bundle links to the guide section on comparing output and power. It leaves
ml/Wh unknown for independent test points. A separate calculation with both
readings from the same setting and conditions verifies the numeric result.

Version 1.22.3 helps GlassVAC owners find the Bosch charging, startup and
storage guidance after a cold night. The archive checks model 06008B7000
with its manual and the current measured ambient temperature. At −8 °C
storage is within range, startup is outside its range, and charging falls
outside the recommended range. At +2 °C all three temperature checks pass.
The tool requests the current temperature before returning a result.

Version 1.22.4 follows explicit model corrections in German questions about
the Bosch GlassVAC and Kärcher WV 8. The archive checks both directions,
including the Kärcher LED table with a confirmed blink pattern and motor
state. A generic cold-charging question about the WV 8 and a question about
both machines leave the finder result empty.

Version 1.22.5 finds the window dew-point calculator for
“Fenstersauger gegen Kondenswasser” and links to the answer section. The
archive checks standard and compact results for a measured inner surface below,
near and above the dew point, including both boundaries of the 1 °C
orientation band. A missing surface reading returns an input error. The share
link contains no household measurements or affiliate parameters.

Version 1.22.6 keeps the nominal fit checks consistent at exact decimal window
widths. An already-owned nozzle that fits still suppresses the purchase link.
An exact 133 mm opening after clearance keeps the matching Bosch package in
the shortlist when comparison is requested. A genuinely narrower opening
stays out of that branch. The checks still require actual head clearance
and package confirmation.

Version 1.22.7 adds an offline calculator for the direct electricity cost of
one drying run with a dehumidifier. It accepts measured kWh or an estimate
from measured average power and run time. Both MCP modes verify the separate
inputs, the German guide link, and continued availability of the
two-method comparison.

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
