"""Zero-network tests for the forecast ledger and the bot's recording path (2026-09-27).

Run: python3 tools/metaculus-bot/test_ledger.py

What must never break, and why each is asserted:
  * a sealed line opens only with the right key and only if its digest matches — the point-in-time
    proof is worthless if a line can be altered and still "verify";
  * without a token nothing secret is written — a live forecast must never land in the public repo
    in plaintext before the question closes;
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
sig = ledger.failure_signature(RuntimeError("Incorrect API key provided: sk-ant-api03-abcdEFGH1234 please check"))
ck("sk-ant" not in sig and "abcd" not in sig and sig.startswith("RuntimeError:"), "failure signature redacts key-shaped strings")
sig2 = ledger.failure_signature(ValueError("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9xyz no allowance"))
ck("eyJ" not in sig2, "bearer tokens redacted")
ck(ledger.failure_signature(RuntimeError("model 400")) == "RuntimeError:model 400", "plain messages kept")
ck(ledger.summarize_prediction(object())["type"] == "object", "unknown shape never raises")

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
                         ok=0, failed=1, failure_signature="RuntimeError:model 400", when=datetime.now(timezone.utc))]
code = main._record(bot, [RuntimeError("model 400")], {}, True, "tournament", 1, cm, 33121, 99, 1, prior,
                    datetime.now(timezone.utc).date().isoformat())
ck(code == 0, "second identical failure the same day does not go red again")
code = main._record(bot, [RuntimeError("model 400")], {}, True, "tournament", 1, cm, 33121, 99, 1, [], "2026-09-28")
ck(code == 1, "first failure of the day still goes red")

print(f"{'FAILED' if fails else 'PASSED'}: {fails} failure(s)")
sys.exit(1 if fails else 0)
