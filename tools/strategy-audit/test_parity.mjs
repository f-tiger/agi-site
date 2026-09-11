// Parity test: the browser version of the Backtest Reality Check and the Python one must
// agree. Two implementations of the same statistics is a liability unless something checks
// them against each other every deploy — a page that quietly disagreed with the CLI would be
// worse than having no page, because the number it printed would still look authoritative.
//
// The JavaScript is read out of the published page rather than from a copy, so the thing
// tested is the thing served. Run: node tools/strategy-audit/test_parity.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PAGE = join(ROOT, "sites", "agiscorecard", "backtest-audit.html");
const PY = join(HERE, "audit.py");

// Tolerance is set by the browser's error function: the page uses Abramowitz & Stegun 7.1.26,
// good to about 1.5e-7 absolute, while Python uses math.erf. Anything looser than this would
// let a real disagreement hide; anything tighter would fail on the approximation alone.
const TOL = 2e-6;

function extractScript() {
  const html = readFileSync(PAGE, "utf8");
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (!blocks.length) throw new Error("no inline <script> found in the page");
  return blocks.reduce((a, b) => (b.length > a.length ? b : a));
}

function loadBrowserModule() {
  const dir = mkdtempSync(join(tmpdir(), "parity-"));
  const file = join(dir, "audit.cjs");
  writeFileSync(file, extractScript(), "utf8");
  return createRequire(import.meta.url)(file);
}

// Deterministic inputs, no randomness: a parity test that fails only sometimes is noise.
function makeSeries(n, drift, kind) {
  const out = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    const r = 0.001 * ((i * 37) % 23 - 11) + drift + (kind.startsWith("skewed") && i % 41 === 0 ? -0.03 : 0);
    v *= 1 + r;
    out.push(kind.endsWith("returns") ? r : v);
  }
  return out;
}

const CASES = [
  { name: "daily, one trial, reachable target", series: makeSeries(252, 0.0006, "equity"),
    kind: "equity", ppy: 252, trials: 1, target: 1.0, turnover: 12, cost: 5 },
  { name: "daily, 500 trials, deflated hard", series: makeSeries(252, 0.0006, "equity"),
    kind: "equity", ppy: 252, trials: 500, target: 1.0, turnover: 12, cost: 5 },
  { name: "thin edge, target out of reach", series: makeSeries(504, 0.0002, "equity"),
    kind: "equity", ppy: 252, trials: 50, target: 1.0, turnover: null, cost: 5 },
  { name: "returns input, fat left tail", series: makeSeries(400, 0.0008, "skewed-returns"),
    kind: "returns", ppy: 252, trials: 20, target: 0.3, turnover: 50, cost: 10 },
  // Equity values pasted into the returns field. Both sides must refuse identically rather
  // than crash on one side and print Infinity on the other — which is what they used to do.
  { name: "units error: equity pasted as returns", series: makeSeries(120, 0.0006, "equity"),
    kind: "returns", ppy: 252, trials: 10, target: 1.0, turnover: null, cost: 5 },
  { name: "monthly data, no target", series: makeSeries(120, 0.004, "equity"),
    kind: "equity", ppy: 12, trials: 8, target: null, turnover: 4, cost: 15 },
  { name: "losing strategy", series: makeSeries(252, -0.0009, "equity"),
    kind: "equity", ppy: 252, trials: 100, target: 1.0, turnover: 12, cost: 5 },
];

function pythonReport(c) {
  const prog = `
import json, sys
sys.path.insert(0, ${JSON.stringify(HERE)})
import audit as A
series = json.loads(sys.argv[1])
kind, ppy, trials, target, turnover, cost = json.loads(sys.argv[2])
rets = A.to_returns(series) if kind == "equity" else series
print(json.dumps(A.audit(rets, ppy, trials, target, 0.0, turnover, cost, None, 0.95)))
`;
  const out = execFileSync("python3", ["-c", prog, JSON.stringify(c.series),
    JSON.stringify([c.kind, c.ppy, c.trials, c.target, c.turnover, c.cost])],
    { encoding: "utf8", maxBuffer: 8 << 20 });
  return JSON.parse(out);
}

// Which JS field answers which Python field. Spelled out rather than inferred, so that
// renaming one side breaks the test instead of silently skipping the comparison.
const MAP = [
  ["observations", (p) => p.sample.observations],
  ["years", (p) => p.sample.years],
  ["annualReturnPct", (p) => p.sample.annual_return_pct],
  ["annualVolPct", (p) => p.sample.annual_vol_pct],
  ["skew", (p) => p.sample.skew],
  ["kurtosis", (p) => p.sample.kurtosis_pearson],
  ["sharpeAnnual", (p) => p.sharpe.annual],
  ["expectedBestSharpeAnnual", (p) => p.multiple_testing.expected_best_sharpe_annual],
  ["psrVsZero", (p) => p.tests.psr_vs_zero],
  ["dsr", (p) => p.tests.deflated_sharpe_ratio],
  ["minTrlObs", (p) => p.tests.min_track_record_obs],
  ["minTrlYears", (p) => p.tests.min_track_record_years],
];

const TARGET_MAP = [
  ["requiredFull", (t) => t.required_sharpe_full_kelly],
  ["requiredHalf", (t) => t.required_sharpe_half_kelly],
  ["ceilingPct", (t) => t.max_cagr_any_leverage_pct],
  ["reachable", (t) => t.reachable],
  ["leverage", (t) => t.leverage_for_target],
];

const COST_MAP = [
  ["dragPct", (c) => c.annual_cost_drag_pct],
  ["grossSharpe", (c) => c.gross_sharpe],
  ["netSharpe", (c) => c.net_sharpe],
];

const fails = [];
function cmp(label, js, py) {
  if (js === null || py === null || typeof js === "boolean" || typeof py === "boolean") {
    if (js !== py) fails.push(`${label}: js=${js} py=${py}`);
    return;
  }
  if (!Number.isFinite(js) || !Number.isFinite(py)) { fails.push(`${label}: js=${js} py=${py}`); return; }
  const scale = Math.max(1, Math.abs(py));
  if (Math.abs(js - py) / scale > TOL) fails.push(`${label}: js=${js} py=${py}`);
}

const B = loadBrowserModule();
let compared = 0;
for (const c of CASES) {
  const rets = c.kind === "equity" ? B.toReturns(c.series) : c.series;
  const js = B.audit(rets, c.ppy, c.trials, c.target, c.turnover, c.cost);
  const py = pythonReport(c);
  for (const [k, pick] of MAP) {
    if ((js.implausible || py.implausible) && (k === "minTrlObs" || k === "minTrlYears")) continue;
    cmp(`${c.name}/${k}`, js[k], pick(py));
    compared++;
  }
  cmp(`${c.name}/implausible`, js.implausible === true, py.implausible === true);
  compared++;
  if (js.implausible) continue;       // both sides stop; nothing further to compare
  if (c.target !== null) {
    if (!js.target || !py.target) fails.push(`${c.name}: one side produced no target block`);
    else for (const [k, pick] of TARGET_MAP) { cmp(`${c.name}/target.${k}`, js.target[k], pick(py.target)); compared++; }
  }
  if (c.turnover !== null) {
    if (!js.costs || !py.costs) fails.push(`${c.name}: one side produced no cost block`);
    else for (const [k, pick] of COST_MAP) { cmp(`${c.name}/costs.${k}`, js.costs[k], pick(py.costs)); compared++; }
  }
}

// A test that compared nothing would pass. Make that impossible.
if (compared < 80) fails.push(`only ${compared} fields compared — the mapping is not wired up`);

// The page must not quietly ship without the Python file it claims parity with.
try {
  execFileSync("python3", [PY, "--selftest"], { encoding: "utf8" });
} catch (e) {
  fails.push("python selftest failed: " + String(e.stdout || e.message).trim().split("\n").pop());
}

for (const f of fails) console.log("FAIL: " + f);
console.log(`parity: ${fails.length ? fails.length + " FAILED" : "PASS"} (${compared} fields, ${CASES.length} cases)`);
process.exit(fails.length ? 1 : 0);
