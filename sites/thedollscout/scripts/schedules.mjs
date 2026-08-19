/* Pause and resume this repository's scheduled workflows, mechanically.

   Why a script and not a hand edit: a schedule commented out by hand is
   restored by somebody remembering to uncomment it. Nobody remembers. The
   pause that prompted this one is fleet-wide and two weeks long, and the
   restore is meant to happen inside an automated session on 1 September — so
   the undo has to be a command, and it has to be able to tell you whether it
   actually did anything.

   Context, so a later reader knows this was not a code problem: on 2026-08-18
   the ACCOUNT's GitHub Actions minutes ran out (a 2,000 min/month pool shared
   across every repo). The signature is unmistakable — a run fails in about two
   seconds with runner_id 0 and an empty runner_name, before a single step
   executes. Every scheduled run between then and the monthly reset would fail
   that way, so pausing costs no data that was not already lost; it only stops
   the failure noise.

   Encoding: the original lines are kept verbatim behind a "#PAUSED>" prefix,
   so resume is a pure un-prefix and cannot paraphrase a cron expression.

   Run: node scripts/schedules.mjs            (report)
        node scripts/schedules.mjs --pause
        node scripts/schedules.mjs --resume */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const DIR = ".github/workflows";
const PREFIX = "#PAUSED>";
const NOTE = "#PAUSE-NOTE#";
const REASON = [
  `${NOTE} SCHEDULE PAUSED 2026-08-18 → 2026-09-01 (owner's instruction).`,
  `${NOTE} The account's GitHub Actions minutes ran out; every scheduled run was`,
  `${NOTE} failing in ~2s with runner_id 0. The quota resets on the 1st.`,
  `${NOTE} Restore with: node scripts/schedules.mjs --resume`,
  `${NOTE} Do NOT uncomment by hand — the resume path is what gets tested.`,
];

const mode = process.argv.includes("--pause") ? "pause"
  : process.argv.includes("--resume") ? "resume"
  : "report";

const files = readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
let changed = 0;

for (const name of files) {
  const path = `${DIR}/${name}`;
  const lines = readFileSync(path, "utf8").split("\n");
  const before = lines.join("\n");

  const paused = lines.some((l) => l.startsWith(PREFIX));
  const live = lines.some((l) => /^\s{1,4}schedule:\s*$/.test(l));
  if (!paused && !live) continue;

  if (mode === "report") {
    const crons = lines
      .filter((l) => /cron:/.test(l))
      .map((l) => (l.match(/cron:\s*['"]?([^'"#]+)/) || [])[1]?.trim())
      .filter(Boolean);
    console.log(`  ${paused ? "PAUSED " : "active "} ${name.padEnd(20)} ${crons.join(", ")}`);
    continue;
  }

  let out = [];
  if (mode === "pause") {
    if (paused) { console.log(`  already paused  ${name}`); continue; }
    for (let i = 0; i < lines.length; i++) {
      /* The schedule key under `on:`, plus every line indented beneath it. */
      if (/^(\s{1,4})schedule:\s*$/.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        out.push(...REASON.map((r) => " ".repeat(indent) + r));
        out.push(PREFIX + lines[i]);
        i++;
        while (i < lines.length && (lines[i].trim() === "" ? false : lines[i].match(/^(\s*)/)[1].length > indent)) {
          out.push(PREFIX + lines[i]);
          i++;
        }
        i--;
        continue;
      }
      out.push(lines[i]);
    }
  } else {
    if (!paused) { console.log(`  not paused      ${name}`); continue; }
    out = lines
      .filter((l) => !l.includes(NOTE))
      .map((l) => (l.startsWith(PREFIX) ? l.slice(PREFIX.length) : l));
  }

  const after = out.join("\n");
  if (after === before) continue;

  /* Two invariants, checked on the text that is about to be written. A
     workflow that loses workflow_dispatch cannot be run by hand either, which
     would turn a pause into a decommission. */
  if (!/workflow_dispatch:/.test(after)) {
    console.log(`FAIL  ${name}: workflow_dispatch disappeared. Not written.`);
    process.exitCode = 1;
    continue;
  }
  if (mode === "pause" && /^\s{1,4}schedule:\s*$/m.test(after)) {
    console.log(`FAIL  ${name}: a live schedule survived the pause. Not written.`);
    process.exitCode = 1;
    continue;
  }
  if (mode === "resume" && !/^\s{1,4}schedule:\s*$/m.test(after)) {
    console.log(`FAIL  ${name}: resume produced no schedule key. Not written.`);
    process.exitCode = 1;
    continue;
  }

  writeFileSync(path, after);
  changed++;
  console.log(`  ${mode}d ${" ".repeat(mode === "pause" ? 1 : 0)}${name}`);
}

if (mode === "report") console.log("\nnode scripts/schedules.mjs --pause | --resume");
else console.log(`\n${changed} workflow(s) ${mode}d.`);
