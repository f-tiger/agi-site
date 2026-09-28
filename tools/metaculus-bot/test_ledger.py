"""Zero-network tests for the forecast ledger and the bot's recording path (2026-09-27).

Run: python3 tools/metaculus-bot/test_ledger.py

What must never break, and why each is asserted:
  * a sealed line opens only with the right key and only if its digest matches — the point-in-time
    proof is worthless if a line can be altered and still "verify";
  * without a token nothing secret is written — a live forecast must never land in the public repo
    in plaintext before the question closes;
  * the digest HIDES (commit_v 2): with every public field known, brute force over the bot's whole
    output grid (integer percent × no-shadow/integer-percent shadow) recovers nothing — and the same
    brute force DOES recover a line built the v1 way (no nonce), so this test can fail;
  * the digest BINDS: one changed character of the revealed text fails it, and unseal_text() gives
    the exact string a third party re-hashes; and the opened text must belong to the line it is filed
    under — a sealed+digest pair copied from another line (the 09-27 review repro) opens as None;
  * ciphertext length is the same across binary values (padding), and the padding test has teeth;
  * public logs: redact() hides by default; an AST gate over main.py refuses any log/print call that
    passes research/reasoning/a forecast value outside redact(), and any unguarded
    log_report_summary(); the real binary/research paths are run with stubs and their log output
    is checked for the values; forecasting_tools' value validators (binary_report:29 / :34) print
    nothing, and every other library line formats identically whatever its location or length;
  * a failed question is reported by leaf exception type + HTTP status only: diagnosable (the 09-07
    allowance error still names litellm.BadRequestError(400) and still gets its hint) but no message
    text, and runs.jsonl's failure_signature is the same for the same cause and differs across causes;
  * the daily cap reads spend from the committed run log and ignores dry runs;
  * the same failure turns at most one run red per UTC day (the 09-07 twelve-mails-a-day lesson);
  * _record() writes one line per successful forecast with the house-prior flag and the shadow,
    and writes nothing on a dry run.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import types
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
fails = 0


def ck(cond, msg):
    global fails
    if cond:
        print("  ok  ", msg)
    else:
        print("  FAIL", msg)
        fails += 1


tmp = Path(tempfile.mkdtemp())
os.environ["BOT_LEDGER_DIR"] = str(tmp)
import ledger  # noqa: E402

ledger.LEDGER_DIR = tmp

print("ledger")
key = ledger.derive_key("tok-123")
other = ledger.derive_key("tok-456")
ck(ledger.derive_key("") is None, "no token → no key")
ck(key and len(key) == 44 and key != other, "key derived per token (44-char urlsafe b64)")
when = datetime(2026, 9, 28, 6, 13, tzinfo=timezone.utc)
line = ledger.forecast_line(question_id=101, post_id=202, tournament=33121, kind="BinaryQuestion",
                            prediction={"p": 0.31}, shadow=0.42, house_prior_used=True, model="m",
                            run_id="r1", commit="abc", key=key, when=when, page_url="https://x/q/202")
ck("sealed" in line and "0.31" not in json.dumps(line) and "0.42" not in json.dumps(line),
   "public line carries no plaintext probability or shadow")
plain = ledger.unseal(line, key)
ck(plain and plain["prediction"] == {"p": 0.31} and plain["shadow_no_prior"] == 0.42, "right key opens it")
ck(ledger.unseal(line, other) is None, "wrong key does not open it")
tampered = dict(line, digest="0" * 64)
ck(ledger.unseal(tampered, key) is None, "digest mismatch → refused")
bare = ledger.forecast_line(question_id=1, post_id=2, tournament=1, kind="BinaryQuestion", prediction={"p": 0.5},
                            shadow=None, house_prior_used=False, model="m", run_id="r", commit="c", key=None, when=when)
ck("sealed" not in bare and "digest" in bare and bare["shadow_logged"] is False, "no key → digest only, nothing secret")

# ---------------------------------------------------------------- commit_v 2: hiding
import hashlib  # noqa: E402

print("commitment: hiding (brute force over the bot's output grid)")


def brute(pub: dict, page_url: str):
    """The attack that broke v1: every plaintext field except the probabilities is public or derivable,
    and the bot answers "Probability: ZZ%" clamped to 1..99, shadow likewise or null."""
    for i in range(1, 100):
        for j in [None] + list(range(1, 100)):
            s = None if j is None else j / 100
            guess = {"question_id": pub["question_id"], "prediction": {"p": i / 100}, "shadow_no_prior": s,
                     "page_url": page_url, "submitted_at": pub["submitted_at"]}
            if hashlib.sha256(ledger.canonical(guess).encode()).hexdigest() == pub["digest"]:
                return (i / 100, s)
    return None


url = "https://www.metaculus.com/questions/39999"
v2 = ledger.forecast_line(question_id=40001, post_id=39999, tournament=33121, kind="BinaryQuestion",
                          prediction={"p": 0.37}, shadow=0.42, house_prior_used=True, model="m", run_id="r",
                          commit="c", key=key, when=when, page_url=url)
ck(v2.get("commit_v") == ledger.COMMIT_V == 2, "public line says commit_v 2")
opened = ledger.unseal(v2, key) or {}
nonce = opened.get("nonce") if isinstance(opened.get("nonce"), str) else ""
ck(len(nonce) == 64 and all(c in "0123456789abcdef" for c in nonce), "sealed plaintext carries a 64-hex nonce")
ck("nonce" not in v2 and bool(nonce) and nonce not in json.dumps(v2), "the nonce is never in the public line")
ck(brute(v2, url) is None, "v2: brute force over 99 × 100 guesses with all public fields known recovers nothing")
# teeth: the very same plaintext minus the nonce, sealed the v1 way, must fall to the very same attack
v1_plain = {k: v for k, v in opened.items() if k != "nonce"}
v1 = dict({k: v for k, v in v2.items() if k not in ("digest", "sealed", "key_id")}, **ledger.seal(v1_plain, key))
ck(brute(v1, url) == (0.37, 0.42), "teeth: the same brute force DOES recover a v1 (nonce-free) line → (0.37, 0.42)")

print("commitment: binding")
text = ledger.unseal_text(v2, key)
ck(text is not None and hashlib.sha256(text.encode()).hexdigest() == v2["digest"], "unseal_text is the exact string whose sha256 is the digest")
ck(json.loads(text) == opened, "unseal() == json.loads(unseal_text())")
text = text or ""
flip_p = text.replace('"p":0.37', '"p":0.38')
nonce_at = text.find(nonce) if nonce else -1
flip_n = text[:nonce_at] + ("1" if text[nonce_at] != "1" else "2") + text[nonce_at + 1:] if nonce_at >= 0 else text
ck(flip_p != text and hashlib.sha256(flip_p.encode()).hexdigest() != v2["digest"], "one changed probability digit fails the digest")
ck(flip_n != text and hashlib.sha256(flip_n.encode()).hexdigest() != v2["digest"], "one changed nonce character fails the digest")
ck(ledger.unseal_text(v2, other) is None and ledger.unseal_text(v2, None) is None, "unseal_text: wrong key / no key → None")
ck(ledger.unseal_text(dict(v2, digest="0" * 64), key) is None, "unseal_text: tampered digest → None")
from cryptography.fernet import Fernet  # noqa: E402

swapped = dict(v2, sealed=Fernet(key).encrypt(flip_p.encode()).decode())
ck(ledger.unseal_text(swapped, key) is None and ledger.unseal(swapped, key) is None,
   "a re-encrypted different forecast under the right key but the committed digest → None")
# the 09-27 review repro: the digest binds bytes, not the line they are filed under
line_a = ledger.forecast_line(question_id=1, post_id=11, tournament=1, kind="BinaryQuestion", prediction={"p": 0.9}, shadow=None,
                              house_prior_used=True, model="m", run_id="r", commit="c", key=key, when=when)
line_b = ledger.forecast_line(question_id=2, post_id=12, tournament=1, kind="BinaryQuestion", prediction={"p": 0.2}, shadow=0.8,
                              house_prior_used=True, model="m", run_id="r", commit="c", key=key, when=when)
ck(ledger.unseal(line_a, key)["question_id"] == 1 and ledger.unseal(line_b, key)["question_id"] == 2, "each line opens on its own")
moved = dict(line_a, sealed=line_b["sealed"], digest=line_b["digest"])
ck(ledger.unseal_text(moved, key) is None and ledger.unseal(moved, key) is None,
   "B's sealed+digest copied onto line A (other question_id) → None, not B's forecast under A's post_id")
later = ledger.forecast_line(question_id=1, post_id=11, tournament=1, kind="BinaryQuestion", prediction={"p": 0.1}, shadow=None,
                             house_prior_used=False, model="m", run_id="r2", commit="c", key=key,
                             when=datetime(2026, 9, 29, 6, 13, tzinfo=timezone.utc))
ck(ledger.unseal(dict(line_a, sealed=later["sealed"], digest=later["digest"]), key) is None,
   "same question, another submission's sealed+digest (other submitted_at) → None")
ck(ledger.unseal(dict(line_a, submitted_at="2026-09-28T06:13:01+00:00"), key) is None,
   "public submitted_at edited after the fact → None")
fixed = "ab" * 32
det = ledger.forecast_line(question_id=40001, post_id=39999, tournament=33121, kind="BinaryQuestion",
                           prediction={"p": 0.37}, shadow=0.42, house_prior_used=True, model="m", run_id="r",
                           commit="c", key=None, when=when, page_url=url, nonce=fixed)
ck(det["digest"] == hashlib.sha256(ledger.canonical(dict(v1_plain, nonce=fixed)).encode()).hexdigest(),
   "digest = sha256(canonical(plain incl. nonce)) — a third party can recompute it from the reveal")
try:
    ledger.forecast_line(question_id=1, post_id=2, tournament=1, kind="BinaryQuestion", prediction={"p": 0.5}, shadow=None,
                         house_prior_used=False, model="m", run_id="r", commit="c", key=None, when=when, nonce="xyz")
    ck(False, "a malformed nonce is refused")
except ValueError:
    ck(True, "a malformed nonce is refused")

print("commitment: fresh nonce per line")
twin_a = ledger.forecast_line(question_id=7, post_id=8, tournament=1, kind="BinaryQuestion", prediction={"p": 0.5}, shadow=None,
                              house_prior_used=False, model="m", run_id="r", commit="c", key=key, when=when, page_url=url)
twin_b = ledger.forecast_line(question_id=7, post_id=8, tournament=1, kind="BinaryQuestion", prediction={"p": 0.5}, shadow=None,
                              house_prior_used=False, model="m", run_id="r", commit="c", key=key, when=when, page_url=url)
ck(twin_a["digest"] != twin_b["digest"] and (ledger.unseal(twin_a, key) or {}).get("nonce") != (ledger.unseal(twin_b, key) or {}).get("nonce"),
   "identical inputs → different nonces and different digests (equal forecasts are not linkable)")

print("commitment: ciphertext length")
variants = [({"p": 0.4}, None), ({"p": 0.3712}, 0.42), ({"p": 0.05}, 0.4), ({"p": 0.99}, 0.01)]
padded_same, unpadded_differs = True, False
for n in range(1, 17):  # 16 url lengths put the value at every offset inside an AES block
    u = "https://www.metaculus.com/questions/" + "9" * n
    lines = [ledger.forecast_line(question_id=1, post_id=2, tournament=1, kind="BinaryQuestion", prediction=pr, shadow=sh,
                                  house_prior_used=True, model="m", run_id="r", commit="c", key=key, when=when, page_url=u)
             for pr, sh in variants]
    padded_same &= len({len(x["sealed"]) for x in lines}) == 1
    raw = {len(Fernet(key).encrypt(ledger.unseal_text(x, key).encode())) for x in lines}
    unpadded_differs |= len(raw) > 1
ck(padded_same, "sealed length is identical across binary values at every url length")
ck(unpadded_differs, "teeth: without the padding the same values DO differ in ciphertext length")

print("public logs: redact()")
os.environ.pop("BOT_LOG_PLAINTEXT", None)
secret = "…(e) base rate 1 in 3.\nProbability: 37%"
ck(ledger.redact(secret) == f"[sealed: {len(secret)} chars]" and "37" not in ledger.redact(secret), "default: length only")
ck(ledger.redact(0.37) == "[sealed: 4 chars]", "non-strings are str()-ed before their length is taken")
os.environ["BOT_LOG_PLAINTEXT"] = "0"
ck(ledger.redact(secret).startswith("[sealed:"), "BOT_LOG_PLAINTEXT=0 still hides")
os.environ["BOT_LOG_PLAINTEXT"] = "1"
ck(ledger.redact(secret) == secret and ledger.redact(0.37) == "0.37", "BOT_LOG_PLAINTEXT=1 passes through")
os.environ.pop("BOT_LOG_PLAINTEXT", None)
ck(ledger.redact("%.4f" % 0.4) == ledger.redact("%.4f" % 0.3712), "fixed-width binary value → same redacted length")

runs = [
    ledger.run_line(run_id="a", mode="tournament", published=True, spend_usd=1.5, touched_main=3, touched_mini=0, ok=3, failed=0, when=when),
    ledger.run_line(run_id="b", mode="tournament", published=False, spend_usd=9, touched_main=3, touched_mini=0, ok=3, failed=0, when=when),
    ledger.run_line(run_id="c", mode="tournament", published=True, spend_usd=2, touched_main=1, touched_mini=0, ok=0, failed=1,
                    failure_signature="Err:no allowance", when=when),
]
ck(ledger.spent_on("2026-09-28", runs) == 3.5, "spent today counts published runs only (dry run ignored)")
ck(ledger.budget_for_run(3, 4, runs, "2026-09-28") == 0.5, "run cap = min(per run, what is left today)")
ck(ledger.budget_for_run(3, 3, runs, "2026-09-28") == 0, "ceiling reached → 0")
ck(ledger.budget_for_run(3, 4, runs, "2026-09-29") == 3, "new UTC day resets")
ck(ledger.failure_already_reported(runs, "2026-09-28", "Err:no allowance"), "same failure same day is recognised")
ck(not ledger.failure_already_reported(runs, "2026-09-29", "Err:no allowance"), "next day it may go red again")
ck(ledger.summarize_prediction(0.123456) == {"p": 0.1235}, "binary prediction summarised")
ck(ledger.summarize_prediction(object())["type"] == "object", "unknown shape never raises")

print("failures: leaf type + HTTP status, never message text")
# a stand-in for litellm's exception: same class name, same module, same status attribute
BadRequestError = type("BadRequestError", (Exception,), {"__module__": "litellm.exceptions"})
RateLimitError = type("RateLimitError", (Exception,), {"__module__": "litellm.exceptions"})


def _http(cls, status, msg):
    e = cls(msg)
    e.status_code = status
    return e


def _lib_failure(leaves, url="https://www.metaculus.com/questions/39999/"):
    """The shape forecasting-tools 0.2.92 returns for a failed question (dumped from the reviewer's e2e run)."""
    inner = ExceptionGroup(f"Errors: {[f'{type(x).__name__}: {x}' for x in leaves]}", leaves)
    return ExceptionGroup(f"1 sub-exceptions -> Error while processing question url: '{url}': 1 sub-exceptions -> "
                          f"All 1 research reports/predictions failed: {inner.message}", [inner])


ambig5 = _lib_failure([ValueError(f"not the same:\nFirst Sample:\nprediction_in_decimal=0.37\n\nSample 2:\nprediction_in_decimal=0.4{i}")
                       for i in range(5)])
ambig4 = _lib_failure([ValueError("First Sample: prediction_in_decimal=0.83") for _ in range(4)],
                      url="https://www.metaculus.com/questions/40123/")
allowance = _lib_failure([_http(BadRequestError, 400, "MetaculusException - You don't have an allowance for model <gpt-4o>")])
keyed = RuntimeError("Incorrect API key provided: sk-ant-api03-abcdEFGH1234 Authorization: Bearer eyJhbGciOiJIUzI1NiJ9xyz")
ck(ledger.failure_leaves(ambig5) == "ValueError×5", "leaves: five structure_output ValueErrors → 'ValueError×5'")
ck(ledger.failure_leaves(allowance) == "litellm.BadRequestError(400)", "leaves: the 09-07 allowance error → 'litellm.BadRequestError(400)'")
try:
    try:
        raise _http(RateLimitError, 429, "slow down")
    except Exception as _c:
        raise RuntimeError("Error while processing question url: 'x': RateLimitError - slow down") from _c
except RuntimeError as _wrapped:
    ck(ledger.failure_leaves(_wrapped) == "litellm.RateLimitError(429)", "leaves: follows raise … from … to the cause")
_cyc = ValueError("a")
_cyc.__cause__ = _cyc
ck(ledger.exception_leaves(_cyc) == [_cyc], "leaves: a cause cycle terminates")
sigs = {n: ledger.failure_signature(e) for n, e in (("ambig5", ambig5), ("ambig4", ambig4), ("allowance", allowance), ("keyed", keyed))}
ck(all(x not in " ".join(sigs.values()) for x in ("0.37", "0.4", "0.83", "Sample", "allowance", "sk-ant", "abcd", "eyJ", "metaculus.com")),
   f"signatures carry no message text, sample value, url or key-shaped string {sigs}")
ck(sigs["ambig5"] == sigs["ambig4"] == "ExceptionGroup>ValueError", "same cause, other question/sample count → same signature (one red per cause per day)")
ck(sigs["allowance"] == "ExceptionGroup>litellm.BadRequestError(400)" and sigs["allowance"] != sigs["ambig5"],
   "different cause → different signature (before: every library failure shared one url-prefix signature)")
ck(sigs["keyed"] == "RuntimeError" and ledger.failure_signature(RuntimeError("model 400")) == "RuntimeError", "a bare exception is its own label")

# ---------------------------------------------------------------- stubbed bot
print("bot recording path (forecasting_tools stubbed)")


class _Q:
    def __init__(self, qid, binary=True):
        self.id_of_question = qid
        self.id_of_post = qid + 1000
        self.page_url = f"https://www.metaculus.com/questions/{qid}/"
        self.question_text = "Will an AI lab release X?"
        self.background_info = ""


ft = types.ModuleType("forecasting_tools")


def _mk(name):
    return type(name, (), {})


for n in ["AskNewsSearcher", "BinaryPrediction", "ConditionalPrediction", "ConditionalQuestion", "DatePercentile",
          "DateQuestion", "GeneralLlm", "MetaculusClient", "MetaculusQuestion", "MultipleChoiceQuestion",
          "NumericDistribution", "NumericQuestion", "Percentile", "PredictedOptionList", "PredictionAffirmed",
          "PredictionTypes", "ReasonedPrediction", "SmartSearcher"]:
    setattr(ft, n, _mk(n))
ft.BinaryQuestion = type("BinaryQuestion", (_Q,), {})
ft.ForecastBot = type("ForecastBot", (), {})
ft.clean_indents = lambda s: s
ft.structure_output = lambda *a, **k: None
dm = types.ModuleType("forecasting_tools.data_models")
fr = types.ModuleType("forecasting_tools.data_models.forecast_report")


class ForecastReport:
    def __init__(self, q, p):
        self.question, self.prediction = q, p


fr.ForecastReport = ForecastReport
sys.modules.update({"forecasting_tools": ft, "forecasting_tools.data_models": dm,
                    "forecasting_tools.data_models.forecast_report": fr})
sys.modules.setdefault("dotenv", types.SimpleNamespace(load_dotenv=lambda *a, **k: None))
import main  # noqa: E402

Bin = ft.BinaryQuestion
q1, q2 = Bin(1), Bin(2)
bot = main.FleetForecastBot()
bot._prior_used = {1: True, 2: False}
bot._research_no_prior = {1: "research without prior", 2: "r2"}


async def _fake_binary(question, research):
    return types.SimpleNamespace(prediction_value=0.6 if research == "research without prior" else 0.9)

bot._run_forecast_on_binary = _fake_binary
reports = [ForecastReport(q1, 0.3), ForecastReport(q2, 0.7), RuntimeError("model 400")]
shadows = asyncio.run(main._shadows(bot, reports))
ck(shadows == {1: 0.6}, "shadow only for binary questions where the house prior was used")

os.environ["METACULUS_TOKEN"] = "tok-123"
os.environ["GITHUB_RUN_ID"] = "999"
main._llm_config = lambda: {"default": "anthropic/claude-sonnet"}
cm = types.SimpleNamespace(current_usage=0.8)
code = main._record(bot, reports, shadows, False, "tournament", 3, cm, 33121, 99, 0, [], "2026-09-28")
ck(code == 0 and not (tmp / "forecasts.jsonl").exists(), "dry run writes nothing")
code = main._record(bot, reports, shadows, True, "tournament", 2, cm, 33121, 99, 0, [], "2026-09-28")
rows = ledger.read_forecasts(tmp)
ck(code == 0 and len(rows) == 2, "one line per successful forecast")
ck(rows[0]["house_prior_used"] is True and rows[0]["shadow_logged"] is True and rows[1]["shadow_logged"] is False,
   "house-prior flag and shadow recorded per question")
ck(ledger.unseal(rows[0], key)["shadow_no_prior"] == 0.6, "shadow is inside the sealed payload")
run = ledger.read_runs(tmp)[-1]
ck(run["spend_usd"] == 0.8 and run["ok"] == 2 and run["failed"] == 1 and run["published"], "run line carries spend and counts")
prior = [ledger.run_line(run_id="x", mode="tournament", published=True, spend_usd=0, touched_main=1, touched_mini=0,
                         ok=0, failed=1, failure_signature=ledger.failure_signature(allowance), when=datetime.now(timezone.utc))]
today_utc = datetime.now(timezone.utc).date().isoformat()
code = main._record(bot, [allowance], {}, True, "tournament", 1, cm, 33121, 99, 1, prior, today_utc)
ck(code == 0, "second identical failure the same day does not go red again")
ck(ledger.read_runs(tmp)[-1]["failure_signature"] == "ExceptionGroup>litellm.BadRequestError(400)",
   "runs.jsonl records the leaf-type signature, not the message")
code = main._record(bot, [ambig5], {}, True, "tournament", 1, cm, 33121, 99, 1, prior, today_utc)
ck(code == 1, "a different cause the same day still goes red")
code = main._record(bot, [RuntimeError("model 400")], {}, True, "tournament", 1, cm, 33121, 99, 1, [], "2026-09-28")
ck(code == 1, "first failure of the day still goes red")

# ---------------------------------------------------------------- public logs: the real code paths
print("public logs: real binary + research paths, log output captured")
import io  # noqa: E402
import logging  # noqa: E402

REASONING = "(a) ZQX-REASONING three months left.\nProbability: 83%"
RESEARCH = "ZQX-RESEARCH: lab announced a new model."


class _FakeLlm(main.GeneralLlm):
    def __init__(self, reply):
        self.reply = reply

    async def invoke(self, prompt):
        return self.reply


async def _fake_structure(text, output_type, **kw):
    return types.SimpleNamespace(prediction_in_decimal=0.83)


main.structure_output = _fake_structure
main.ReasonedPrediction = types.SimpleNamespace
main._house_prior_cache = "ZQX-PRIOR verdicts"  # never touch the network
qx = Bin(3)
qx.resolution_criteria, qx.fine_print, qx.conditional_type = "resolves yes if", "", None
pbot = main.FleetForecastBot()
pbot.get_llm = lambda purpose="default", guarantee_type=None: _FakeLlm(RESEARCH if purpose == "researcher" else REASONING)


def captured(env_plain: bool) -> str:
    if env_plain:
        os.environ["BOT_LOG_PLAINTEXT"] = "1"
    else:
        os.environ.pop("BOT_LOG_PLAINTEXT", None)
    buf = io.StringIO()
    h = logging.StreamHandler(buf)
    main.logger.addHandler(h)
    main.logger.setLevel(logging.INFO)
    main.logger.propagate = False
    try:
        pred = asyncio.run(main.FleetForecastBot._run_forecast_on_binary(pbot, qx, "r"))
        asyncio.run(main.FleetForecastBot.run_research(pbot, qx))
    finally:
        main.logger.removeHandler(h)
        main.logger.propagate = True
        os.environ.pop("BOT_LOG_PLAINTEXT", None)
    ck(pred.prediction_value == 0.83, "stubbed binary path still returns the parsed value (forecast logic unchanged)")
    return buf.getvalue()


pub_log = captured(False)
ck("Forecasted" in pub_log and "Reasoning for" in pub_log and "Research for" in pub_log,
   "public mode: the three log lines still happen (the owner sees progress)")
ck(all(x not in pub_log for x in ("0.83", "83%", "Probability", "ZQX")),
   "public mode: no probability, reasoning, research or house-prior text in the log")
priv_log = captured(True)
ck("Probability: 83%" in priv_log and "0.8300" in priv_log and "ZQX-RESEARCH" in priv_log and "ZQX-PRIOR" in priv_log,
   "teeth: BOT_LOG_PLAINTEXT=1 shows them, so the capture above would have seen a leak")

# every attribute a formatter could print, so no handler format can bring the location back
LOUD = logging.Formatter("%(levelname)s %(name)s %(module)s %(filename)s %(pathname)s %(funcName)s %(lineno)d %(message)s")
BR = "/site-packages/forecasting_tools/data_models/binary_report.py"


def _rec(name, level, path, lineno, msg, args=(), func="f"):
    return logging.LogRecord(name, level, path, lineno, msg, args, None, func)


# the review repro: BinaryPrediction warns from :29 below 0.001 and from :34 above 0.999, and the length told 0.0 from 0.0005
extremes = [_rec("forecasting_tools.data_models.binary_report", logging.WARNING, BR, 34,
                 "Prediction is greater than 0.999, adjusting to 0.999. Value: %s", (1.0,), "validate_prediction_range"),
            _rec("forecasting_tools.data_models.binary_report", logging.WARNING, BR, 29,
                 "Prediction is less than 0.001, adjusting to 0.001. Value: %s", (0.0,), "validate_prediction_range"),
            _rec("forecasting_tools.data_models.binary_report", logging.WARNING, BR, 29,
                 "Prediction is less than 0.001, adjusting to 0.001. Value: %s", (0.0005,), "validate_prediction_range"),
            _rec("forecasting_tools.data_models.multiple_choice_report", logging.WARNING, "/x/multiple_choice_report.py", 36,
                 "Sum of option probabilities %s is not 1", (1.004,))]
ck(not any(main._SealLibraryText().filter(r) for r in extremes),
   "value validators (binary_report :29 / :34, multiple_choice_report) are dropped: no line, no location, no length")
rec = _rec("forecasting_tools.forecast_bots.forecast_bot", logging.WARNING, "/x/forecast_bot.py", 483,
           "Encountered errors while predicting: %s", ("First Sample: prediction_in_decimal=0.37",), "_research_and_make_predictions")
try:
    raise ValueError("Sample 2: prediction_in_decimal=0.41")
except ValueError:
    rec.exc_info = sys.exc_info()
rec2 = _rec("forecasting_tools.util.misc", logging.WARNING, "/x/misc.py", 94, "Retry 1/3 for %s after 1.0s. Error: %s", ("invoke", "short"))
kept = [main._SealLibraryText().filter(r) for r in (rec, rec2)]
shown, shown2 = LOUD.format(rec), LOUD.format(rec2)
ck(all(kept) and shown == shown2, f"two library warnings from different places and lengths format identically: {shown!r}")
ck(all(x not in shown for x in ("0.37", "0.41", "483", "forecast_bot", "Traceback", "Sample", "sealed:")),
   "library warnings: no text, no traceback, no module:line, no length")
err = _rec("forecasting_tools.forecast_bots.forecast_bot", logging.ERROR, "/x/forecast_bot.py", 346, "Error while processing question url: %s", ("u",))
main._SealLibraryText().filter(err)
ck(LOUD.format(err) == shown.replace("WARNING", "ERROR", 1), "an ERROR keeps its level and nothing else")
own = logging.LogRecord("main", logging.INFO, "main.py", 1, "questions touched: main=%d", (3,), None)
main._SealLibraryText().filter(own)
ck(own.getMessage() == "questions touched: main=3", "our own run lines pass the filter untouched")
lookalike = _rec("forecasting_tools_fork", logging.WARNING, "/x/y.py", 1, "kept %s", ("text",))
ck(main._SealLibraryText().filter(lookalike) and lookalike.getMessage() == "kept text", "only the forecasting_tools logger tree is touched")

# 2026-09-27 integration: LiteLLM / asyncio / py.warnings carry model text too (see _SealLibraryText)
others = [_rec("LiteLLM", logging.WARNING, "/x/litellm/utils.py", 7, "reply: %s", ("Probability: 73%",)),
          _rec("LiteLLM Router", logging.ERROR, "/x/router.py", 9, "fallback after %s", ("Probability: 73%",)),
          _rec("asyncio", logging.ERROR, "/x/base_events.py", 1, "Task exception was never retrieved", ()),
          _rec("py.warnings", logging.WARNING, "/x/warnings.py", 1, "%s", ("PydanticSerializationUnexpectedValue: Message(content='Probability: 73%')",))]
try:
    raise RuntimeError("Probability: 73%")
except RuntimeError:
    others[2].exc_info = sys.exc_info()
for r in others:
    main._SealLibraryText().filter(r)
shown_o = [LOUD.format(r) for r in others]
ck(all("73" not in x and "Probability" not in x and "/x/" not in x for x in shown_o),
   f"LiteLLM / asyncio / py.warnings records are sealed: {shown_o!r}")
ck(shown_o[2].endswith("[library log sealed] (RuntimeError)") and " asyncio " in shown_o[2],
   "a sealed record with a traceback keeps only its exception class (why a run died stays readable)")
ck(main._SealLibraryText().filter(_rec("litellm_helpers", logging.WARNING, "/x/y.py", 1, "kept", ())), "lookalike names are not touched")


def configured(env_plain: bool):
    """Run main()'s real logging setup against a capture handler on the root logger."""
    root, ftl = logging.getLogger(), logging.getLogger("forecasting_tools")
    saved = (list(root.handlers), root.level, ftl.level)
    buf = io.StringIO()
    h = logging.StreamHandler(buf)
    root.handlers[:] = [h]  # basicConfig is a no-op once root has a handler, so the capture stays in place
    root.setLevel(logging.INFO)
    ftl.setLevel(logging.NOTSET)
    if env_plain:
        os.environ["BOT_LOG_PLAINTEXT"] = "1"
    try:
        main._configure_logging()
        child = logging.getLogger("forecasting_tools.forecast_bots.forecast_bot")
        child.info("Final prediction 0.83 for ZQX")
        child.warning("Encountered errors while predicting: First Sample: prediction_in_decimal=%s", 0.83)
        logging.getLogger("forecasting_tools.data_models.binary_report").warning(
            "Prediction is greater than 0.999, adjusting to 0.999. Value: %s", 1.0)
        logging.getLogger("main").info("questions touched: main=%d", 2)
        import warnings as _w
        configured.warnings_captured = _w.showwarning is getattr(logging, "_showwarning", object())
        return buf.getvalue(), ftl.level, any(isinstance(f, main._SealLibraryText) for f in h.filters)
    finally:
        os.environ.pop("BOT_LOG_PLAINTEXT", None)
        logging.captureWarnings(False)  # _configure_logging turns it on in public mode; never leak it into later checks
        root.handlers[:] = saved[0]
        root.setLevel(saved[1])
        ftl.setLevel(saved[2])


def own_handler_and_warnings():
    """LiteLLM's own-handler path and warnings.warn, through main()'s real public-mode setup."""
    import warnings
    root, lit = logging.getLogger(), logging.getLogger("LiteLLM")
    saved = (list(root.handlers), list(lit.handlers), lit.propagate, warnings.showwarning)
    rbuf, lbuf = io.StringIO(), io.StringIO()
    root.handlers[:] = [logging.StreamHandler(rbuf)]
    lit.handlers[:] = [logging.StreamHandler(lbuf)]  # what `import litellm` installs
    lit.propagate = False
    try:
        main._configure_logging()
        lit.warning("reply was %s", "Probability: 73%")
        with warnings.catch_warnings():
            warnings.simplefilter("always")
            warnings.warn("Message(content='Probability: 73%')")
        return rbuf.getvalue() + lbuf.getvalue()
    finally:
        logging.captureWarnings(False)
        root.handlers[:], lit.handlers[:], lit.propagate = saved[0], saved[1], saved[2]
        warnings.showwarning = saved[3]


ow = own_handler_and_warnings()
ck("73" not in ow and ow.count("[library log sealed]") == 2,
   f"public mode: LiteLLM's own handler and warnings.warn are sealed too: {ow!r}")

out, lvl, filtered = configured(False)
ck(lvl == logging.WARNING and filtered, "main()'s logging setup: forecasting_tools at WARNING and the seal filter on the root handler")
ck("0.83" not in out and "ZQX" not in out and "0.999" not in out and "binary_report" not in out
   and out.count("[library log sealed]") == 1 and "questions touched: main=2" in out,
   "main()'s logging setup: library INFO dropped, value validator dropped, other library WARNING sealed, our counts still printed")
out, lvl, filtered = configured(True)
ck(not filtered and lvl == logging.NOTSET and "0.83" in out and "0.999" in out,
   "BOT_LOG_PLAINTEXT=1: setup leaves the library output alone")
ck(not configured.warnings_captured, "BOT_LOG_PLAINTEXT=1: Python warnings are not routed through the seal")
_ = configured(False)
ck(configured.warnings_captured, "public mode: Python warnings are captured into logging (so they get sealed)")

print("public logs: summarize() / diagnose() on failures")
import contextlib  # noqa: E402


def printed(fn, *a, plain=False):
    if plain:
        os.environ["BOT_LOG_PLAINTEXT"] = "1"
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            fn(*a)
    finally:
        os.environ.pop("BOT_LOG_PLAINTEXT", None)
    return buf.getvalue()


# a bare failure puts its message inside the first 200 characters, where the pre-fix print showed it
bare = ValueError("First Sample: prediction_in_decimal=0.37")
pub = printed(main.summarize, [ForecastReport(q1, 0.3), ambig5, allowance, bare], False, "tournament")
ck("https://www.metaculus.com/questions/39999/ ExceptionGroup → ValueError×5" in pub
   and "ExceptionGroup → litellm.BadRequestError(400)" in pub and "✗ ValueError → ValueError" in pub,
   "summarize(): each failed question shows its url, leaf types and HTTP status (a red run stays diagnosable)")
ck(all(x not in pub for x in ("0.37", "0.4", "Sample", "prediction_in_decimal", "You don't have")),
   "summarize(): no exception message text in the public log")
ck("额度" in pub, "diagnose(): the allowance hint still fires from the (unprinted) message")
priv = printed(main.summarize, [ambig5], False, "tournament", plain=True)
ck("First Sample" in priv and "0.37" in priv, "teeth: BOT_LOG_PLAINTEXT=1 prints the messages, so the check above could fail")
numeric = _lib_failure([ValueError("First Sample: Percentile 10: 401, Percentile 90: 429")])
ck(printed(main.diagnose, [numeric]) == "", "diagnose(): '401'/'429' inside a quoted sample picks no hint (it would say something about the value)")
ck("限流" in printed(main.diagnose, [_lib_failure([_http(RateLimitError, 429, "slow down")])]),
   "diagnose(): a real 429 (status attribute) still gets the rate-limit hint")
ck("METACULUS_TOKEN" in printed(main.diagnose, [RuntimeError("401 Client Error: Unauthorized for url")]),
   "diagnose(): 'Unauthorized' still gets the token hint")

# ---------------------------------------------------------------- AST gate over main.py
print("public logs: AST gate over main.py")
import ast  # noqa: E402

SENSITIVE = {"research", "reasoning", "decimal_pred", "predicted_option_list", "prediction", "declared_percentiles"}
LOG_METHODS = {"debug", "info", "warning", "warn", "error", "exception", "critical", "log"}
GUARDS = {"ledger.log_plaintext()", "os.getenv('BOT_LOG_PLAINTEXT') == '1'", "os.environ.get('BOT_LOG_PLAINTEXT') == '1'"}


def _is_redact(node):
    f = node.func
    return (isinstance(f, ast.Name) and f.id == "redact") or (isinstance(f, ast.Attribute) and f.attr == "redact")


def _is_log_call(node):
    f = node.func
    if isinstance(f, ast.Name):
        return f.id == "print"
    return isinstance(f, ast.Attribute) and f.attr in LOG_METHODS and "log" in ast.unparse(f.value).lower()


def _bare(node, inside=False):
    """Sensitive names/attributes in this subtree that are not inside a redact(...) call."""
    if isinstance(node, ast.Call) and _is_redact(node):
        inside = True
    out = []
    if not inside and isinstance(node, ast.Name) and node.id in SENSITIVE:
        out.append(node.id)
    if not inside and isinstance(node, ast.Attribute) and node.attr in SENSITIVE:
        out.append(node.attr)
    for child in ast.iter_child_nodes(node):
        out += _bare(child, inside)
    return out


def gate(src: str) -> dict:
    tree = ast.parse(src)
    leaks, logs, redacted = [], 0, 0
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and _is_log_call(node):
            logs += 1
            args = list(node.args) + [k.value for k in node.keywords]
            names = [n for a in args for n in _bare(a)]
            if names:
                leaks.append((node.lineno, names))
            redacted += any(isinstance(x, ast.Call) and _is_redact(x) for a in args for x in ast.walk(a))
    unguarded = []

    def visit(node, guarded):
        if isinstance(node, ast.If):
            visit(node.test, guarded)
            ok = ast.unparse(node.test) in GUARDS
            for c in node.body:
                visit(c, guarded or ok)
            for c in node.orelse:
                visit(c, guarded)
            return
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "log_report_summary" and not guarded:
            unguarded.append(node.lineno)
        for c in ast.iter_child_nodes(node):
            visit(c, guarded)

    visit(tree, False)
    return {"leaks": leaks, "unguarded": unguarded, "logs": logs, "redacted": redacted}


# the gate itself must be able to go red
ck(gate('logger.info("R %s", reasoning)')["leaks"], "gate self-test: bare reasoning in logger.info → flagged")
ck(gate('print(f"{r.prediction}")')["leaks"], "gate self-test: attribute .prediction in print → flagged")
ck(gate('logger.info("F %s", prediction.declared_percentiles)')["leaks"], "gate self-test: .declared_percentiles → flagged")
ck(gate('logger.info("R %s", ledger.redact(x) + research)')["leaks"], "gate self-test: concatenated outside redact → flagged")
ck(not gate('logger.info("R %s", ledger.redact(reasoning))')["leaks"], "gate self-test: redact(reasoning) passes")
ck(gate('bot.log_report_summary(r)')["unguarded"], "gate self-test: unguarded log_report_summary → flagged")
ck(gate('if not ledger.log_plaintext():\n    bot.log_report_summary(r)')["unguarded"], "gate self-test: inverted guard → flagged")
ck(gate('if ledger.log_plaintext():\n    pass\nelse:\n    bot.log_report_summary(r)')["unguarded"], "gate self-test: else-branch → flagged")
ck(not gate('if ledger.log_plaintext():\n    bot.log_report_summary(r)')["unguarded"], "gate self-test: guarded call passes")

main_src = (HERE / "main.py").read_text(encoding="utf-8")
g = gate(main_src)
ck(g["logs"] > 0 and g["redacted"] > 0, f"gate is not vacuous: it sees main.py's log calls ({g['logs']}), {g['redacted']} of them redacted")
ck(not g["leaks"], f"main.py: no log/print passes research/reasoning/forecast values outside redact() {g['leaks']}")
ck(not g["unguarded"], f"main.py: log_report_summary only behind a BOT_LOG_PLAINTEXT guard {g['unguarded']}")

print(f"{'FAILED' if fails else 'PASSED'}: {fails} failure(s)")
sys.exit(1 if fails else 0)
