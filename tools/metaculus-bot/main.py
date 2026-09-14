"""
Fleet forecasting bot for the Metaculus FutureEval bot tournament.

Derived from Metaculus/metac-bot-template (main.py, "SummerTemplateBot2026"),
which Metaculus publishes for bot makers to copy. Fleet changes:

  * house prior  — for AI/AGI-flavoured questions the research step appends the
                   agiscorecard.com scorecard (dated verdicts with pre-registered
                   flip conditions) so the forecaster sees the fleet's own,
                   already-published reasoning instead of re-deriving it.
  * status-quo   — kept from the template; the fleet's own rule is the same
                   ("good forecasters put extra weight on the status quo").
  * red-on-empty — the run exits non-zero when questions were open but zero
                   forecasts succeeded, so a broken key or a broken dependency
                   turns the GitHub run red instead of silently doing nothing.
  * --dry-run    — never publishes; used for local/CI smoke tests.

Secrets: METACULUS_TOKEN is required. Nothing here writes to the repo.

Models are pinned explicitly (see _llm_config). The 2026-09-07 first run proved
why: left to its defaults, forecasting-tools picks `openai/gpt-4o-search-preview`
for the research step, and the Metaculus proxy grants budget **per model name**,
so a model nobody applied for returns 400 "no allowance" — all 10 questions
failed on it. Library defaults are not our defaults. Every role is overridable
with a repo variable so the model set can change without touching this file.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Literal

import dotenv

dotenv.load_dotenv()

from forecasting_tools import (  # noqa: E402
    AskNewsSearcher,
    BinaryPrediction,
    BinaryQuestion,
    ConditionalPrediction,
    ConditionalQuestion,
    DatePercentile,
    DateQuestion,
    ForecastBot,
    GeneralLlm,
    MetaculusClient,
    MetaculusQuestion,
    MultipleChoiceQuestion,
    NumericDistribution,
    NumericQuestion,
    Percentile,
    PredictedOptionList,
    PredictionAffirmed,
    PredictionTypes,
    ReasonedPrediction,
    SmartSearcher,
    clean_indents,
    structure_output,
)
from forecasting_tools.data_models.forecast_report import ForecastReport  # noqa: E402

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------------
# House prior: the fleet's own published scorecard, only for AI questions.
# ----------------------------------------------------------------------------

HOUSE_PRIOR_URL = os.getenv("HOUSE_PRIOR_URL", "https://agiscorecard.com/llms.txt")
HOUSE_PRIOR_MAX_CHARS = 12_000
_AI_TERMS = re.compile(
    r"\b(agi|artificial general intelligence|superintelligence|frontier model|"
    r"large language model|llm|gpt-?\d|claude|gemini|openai|anthropic|deepmind|"
    r"xai|grok|metr|arc-agi|humanity'?s last exam|swe-bench|epoch ai|"
    r"ai (?:model|lab|system|agent|safety|regulation|act|chip|compute)|"
    r"nvidia|tpu|gpu cluster|data ?cent(?:er|re)s?)\b",
    re.IGNORECASE,
)
_house_prior_cache: str | None = None


def looks_like_ai_question(text: str) -> bool:
    return bool(_AI_TERMS.search(text or ""))


def fetch_house_prior() -> str:
    """Fetch the scorecard once per process; any failure degrades to ''."""
    global _house_prior_cache
    if _house_prior_cache is not None:
        return _house_prior_cache
    try:
        import requests

        r = requests.get(HOUSE_PRIOR_URL, timeout=10, headers={"User-Agent": "fleet-metaculus-bot/1.0"})
        r.raise_for_status()
        text = r.text.strip()
        if len(text) > HOUSE_PRIOR_MAX_CHARS:
            text = text[:HOUSE_PRIOR_MAX_CHARS] + "\n[truncated]"
        _house_prior_cache = text
    except Exception as exc:  # network is optional; never fail a forecast on it
        logger.warning("house prior unavailable (%s); continuing without it", exc)
        _house_prior_cache = ""
    return _house_prior_cache


def house_prior_block(question_text: str) -> str:
    if not looks_like_ai_question(question_text):
        return ""
    prior = fetch_house_prior()
    if not prior:
        return ""
    return clean_indents(
        f"""
        ---
        House scorecard (agiscorecard.com, independent, dated verdicts with
        pre-registered flip conditions). Treat as one informed prior, not as the
        answer; check the dates against today's date before relying on it.

        {prior}
        ---
        """
    )


# ----------------------------------------------------------------------------
# Bot
# ----------------------------------------------------------------------------


class FleetForecastBot(ForecastBot):
    _max_concurrent_questions = 1
    _concurrency_limiter = asyncio.Semaphore(_max_concurrent_questions)
    _structure_output_validation_samples = 2

    # --------------------------------------------------------------- research
    async def run_research(self, question: MetaculusQuestion) -> str:
        async with self._concurrency_limiter:
            research = ""
            researcher = self.get_llm("researcher")

            prompt = clean_indents(
                f"""
                You are an assistant to a superforecaster.
                The superforecaster will give you a question they intend to forecast on.
                To be a great assistant, you generate a concise but detailed rundown of the most relevant news, including if the question would resolve Yes or No based on current information.
                You do not produce forecasts yourself.

                Question:
                {question.question_text}

                This question's outcome will be determined by the specific criteria below:
                {question.resolution_criteria}

                {question.fine_print}
                """
            )

            if isinstance(researcher, GeneralLlm):
                research = await researcher.invoke(prompt)
            elif researcher in (
                "asknews/news-summaries",
                "asknews/deep-research/low-depth",
                "asknews/deep-research/medium-depth",
                "asknews/deep-research/high-depth",
            ):
                research = await AskNewsSearcher().call_preconfigured_version(researcher, prompt)
            elif isinstance(researcher, str) and researcher.startswith("smart-searcher"):
                model_name = researcher.removeprefix("smart-searcher/")
                searcher = SmartSearcher(
                    model=model_name,
                    temperature=0,
                    num_searches_to_run=2,
                    num_sites_per_search=10,
                    use_advanced_filters=False,
                )
                research = await searcher.invoke(prompt)
            elif not researcher or researcher == "None" or researcher == "no_research":
                research = ""
            else:
                research = await self.get_llm("researcher", "llm").invoke(prompt)

            research = (research or "") + house_prior_block(
                f"{question.question_text}\n{question.background_info or ''}"
            )
            logger.info("Research for %s:\n%s", question.page_url, research)
            return research

    # ----------------------------------------------------------------- binary
    async def _run_forecast_on_binary(
        self, question: BinaryQuestion, research: str
    ) -> ReasonedPrediction[float]:
        prompt = clean_indents(
            f"""
            You are a professional forecaster interviewing for a job.

            Your interview question is:
            {question.question_text}

            Question background:
            {question.background_info}

            This question's outcome will be determined by the specific criteria below. These criteria have not yet been satisfied:
            {question.resolution_criteria}

            {question.fine_print}

            Your research assistant says:
            {research}

            Today is {datetime.now().strftime("%Y-%m-%d")}.

            Before answering you write:
            (a) The time left until the outcome to the question is known.
            (b) The status quo outcome if nothing changed.
            (c) A brief description of a scenario that results in a No outcome.
            (d) A brief description of a scenario that results in a Yes outcome.
            (e) The base rate for events of this kind, if one can be named, and whether the resolution criteria are stricter or looser than that base rate assumes.

            You write your rationale remembering that good forecasters put extra weight on the status quo outcome since the world changes slowly most of the time.
            {self._get_conditional_disclaimer_if_necessary(question)}

            The last thing you write is your final answer as: "Probability: ZZ%", 0-100
            """
        )
        reasoning = await self.get_llm("default", "llm").invoke(prompt)
        logger.info("Reasoning for %s: %s", question.page_url, reasoning)
        binary_prediction: BinaryPrediction = await structure_output(
            reasoning,
            BinaryPrediction,
            model=self.get_llm("parser", "llm"),
            num_validation_samples=self._structure_output_validation_samples,
        )
        decimal_pred = max(0.01, min(0.99, binary_prediction.prediction_in_decimal))
        logger.info("Forecasted %s: %s", question.page_url, decimal_pred)
        return ReasonedPrediction(prediction_value=decimal_pred, reasoning=reasoning)

    # -------------------------------------------------------- multiple choice
    async def _run_forecast_on_multiple_choice(
        self, question: MultipleChoiceQuestion, research: str
    ) -> ReasonedPrediction[PredictedOptionList]:
        prompt = clean_indents(
            f"""
            You are a professional forecaster interviewing for a job.

            Your interview question is:
            {question.question_text}

            The options are: {question.options}

            Background:
            {question.background_info}

            {question.resolution_criteria}

            {question.fine_print}

            Your research assistant says:
            {research}

            Today is {datetime.now().strftime("%Y-%m-%d")}.

            Before answering you write:
            (a) The time left until the outcome to the question is known.
            (b) The status quo outcome if nothing changed.
            (c) A description of an scenario that results in an unexpected outcome.

            {self._get_conditional_disclaimer_if_necessary(question)}
            You write your rationale remembering that (1) good forecasters put extra weight on the status quo outcome since the world changes slowly most of the time, and (2) good forecasters leave some moderate probability on most options to account for unexpected outcomes.

            The last thing you write is your final probabilities for the N options in this order {question.options} as:
            Option_A: Probability_A
            Option_B: Probability_B
            ...
            Option_N: Probability_N
            """
        )
        parsing_instructions = clean_indents(
            f"""
            Make sure that all option names are one of the following:
            {question.options}

            The text you are parsing may prepend these options with some variation of "Option" which you should remove if not part of the option names I just gave you.
            Additionally, you may sometimes need to parse a 0% probability. Please do not skip options with 0% but rather make it an entry in your final list with 0% probability.
            """
        )
        reasoning = await self.get_llm("default", "llm").invoke(prompt)
        logger.info("Reasoning for %s: %s", question.page_url, reasoning)
        predicted_option_list: PredictedOptionList = await structure_output(
            text_to_structure=reasoning,
            output_type=PredictedOptionList,
            model=self.get_llm("parser", "llm"),
            num_validation_samples=self._structure_output_validation_samples,
            additional_instructions=parsing_instructions,
        )
        logger.info("Forecasted %s: %s", question.page_url, predicted_option_list)
        return ReasonedPrediction(prediction_value=predicted_option_list, reasoning=reasoning)

    # ---------------------------------------------------------------- numeric
    async def _run_forecast_on_numeric(
        self, question: NumericQuestion, research: str
    ) -> ReasonedPrediction[NumericDistribution]:
        upper_bound_message, lower_bound_message = self._create_upper_and_lower_bound_messages(question)
        prompt = clean_indents(
            f"""
            You are a professional forecaster interviewing for a job.

            Your interview question is:
            {question.question_text}

            Background:
            {question.background_info}

            {question.resolution_criteria}

            {question.fine_print}

            Units for answer: {question.unit_of_measure if question.unit_of_measure else "Not stated (please infer this)"}

            Your research assistant says:
            {research}

            Today is {datetime.now().strftime("%Y-%m-%d")}.

            {lower_bound_message}
            {upper_bound_message}

            Formatting Instructions:
            - Please notice the units requested and give your answer in these units (e.g. whether you represent a number as 1,000,000 or 1 million).
            - Never use scientific notation.
            - Always start with a smaller number (more negative if negative) and then increase from there. The value for percentile 10 should always be less than the value for percentile 20, and so on.

            Before answering you write:
            (a) The time left until the outcome to the question is known.
            (b) The outcome if nothing changed.
            (c) The outcome if the current trend continued.
            (d) The expectations of experts and markets.
            (e) A brief description of an unexpected scenario that results in a low outcome.
            (f) A brief description of an unexpected scenario that results in a high outcome.

            {self._get_conditional_disclaimer_if_necessary(question)}
            You remind yourself that good forecasters are humble and set wide 90/10 confidence intervals to account for unknown unknowns.

            The last thing you write is your final answer as:
            "
            Percentile 10: XX (lowest number value)
            Percentile 20: XX
            Percentile 40: XX
            Percentile 60: XX
            Percentile 80: XX
            Percentile 90: XX (highest number value)
            "
            """
        )
        reasoning = await self.get_llm("default", "llm").invoke(prompt)
        logger.info("Reasoning for %s: %s", question.page_url, reasoning)
        parsing_instructions = clean_indents(
            f"""
            The text given to you is trying to give a forecast distribution for a numeric question.
            - This text is trying to answer the numeric question: "{question.question_text}".
            - When parsing the text, please make sure to give the values (the ones assigned to percentiles) in terms of the correct units.
            - The units for the forecast are: {question.unit_of_measure}
            - Your work will be shown publicly with these units stated verbatim after the numbers your parse.
            - As an example, someone else guessed that the answer will be between {question.lower_bound} {question.unit_of_measure} and {question.upper_bound} {question.unit_of_measure}, so the numbers parsed from an answer like this would be verbatim "{question.lower_bound}" and "{question.upper_bound}".
            - If the answer doesn't give the answer in the correct units, you should parse it in the right units. For instance if the answer gives numbers as $500,000,000 and units are "B $" then you should parse the answer as 0.5 (since $500,000,000 is $0.5 billion).
            - If percentiles are not explicitly given (e.g. only a single value is given) please don't return a parsed output, but rather indicate that the answer is not explicitly given in the text.
            - Turn any values that are in scientific notation into regular numbers.
            """
        )
        percentile_list: list[Percentile] = await structure_output(
            reasoning,
            list[Percentile],
            model=self.get_llm("parser", "llm"),
            additional_instructions=parsing_instructions,
            num_validation_samples=self._structure_output_validation_samples,
        )
        prediction = NumericDistribution.from_question(percentile_list, question)
        logger.info("Forecasted %s: %s", question.page_url, prediction.declared_percentiles)
        return ReasonedPrediction(prediction_value=prediction, reasoning=reasoning)

    # ------------------------------------------------------------------- date
    async def _run_forecast_on_date(
        self, question: DateQuestion, research: str
    ) -> ReasonedPrediction[NumericDistribution]:
        upper_bound_message, lower_bound_message = self._create_upper_and_lower_bound_messages(question)
        prompt = clean_indents(
            f"""
            You are a professional forecaster interviewing for a job.

            Your interview question is:
            {question.question_text}

            Background:
            {question.background_info}

            {question.resolution_criteria}

            {question.fine_print}

            Your research assistant says:
            {research}

            Today is {datetime.now().strftime("%Y-%m-%d")}.

            {lower_bound_message}
            {upper_bound_message}

            Formatting Instructions:
            - This is a date question, and as such, the answer must be expressed in terms of dates.
            - The dates must be written in the format of YYYY-MM-DD. If hours matter, please append the date with the hour in UTC and military time: YYYY-MM-DDTHH:MM:SSZ. No other formatting is allowed.
            - Always start with a lower date chronologically and then increase from there.
            - Do NOT forget this. The dates must be written in chronological order starting at the earliest time at percentile 10 and increasing from there.

            Before answering you write:
            (a) The time left until the outcome to the question is known.
            (b) The outcome if nothing changed.
            (c) The outcome if the current trend continued.
            (d) The expectations of experts and markets.
            (e) A brief description of an unexpected scenario that results in a low outcome.
            (f) A brief description of an unexpected scenario that results in a high outcome.

            {self._get_conditional_disclaimer_if_necessary(question)}
            You remind yourself that good forecasters are humble and set wide 90/10 confidence intervals to account for unknown unknowns.

            The last thing you write is your final answer as:
            "
            Percentile 10: YYYY-MM-DD (oldest date)
            Percentile 20: YYYY-MM-DD
            Percentile 40: YYYY-MM-DD
            Percentile 60: YYYY-MM-DD
            Percentile 80: YYYY-MM-DD
            Percentile 90: YYYY-MM-DD (newest date)
            "
            """
        )
        reasoning = await self.get_llm("default", "llm").invoke(prompt)
        logger.info("Reasoning for %s: %s", question.page_url, reasoning)
        parsing_instructions = clean_indents(
            f"""
            The text given to you is trying to give a forecast distribution for a date question.
            - This text is trying to answer the question: "{question.question_text}".
            - As an example, someone else guessed that the answer will be between {question.lower_bound} and {question.upper_bound}, so the numbers parsed from an answer like this would be verbatim "{question.lower_bound}" and "{question.upper_bound}".
            - The output is given as dates/times please format it into a valid datetime parsable string. Assume midnight UTC if no hour is given.
            - If percentiles are not explicitly given (e.g. only a single value is given) please don't return a parsed output, but rather indicate that the answer is not explicitly given in the text.
            """
        )
        date_percentile_list: list[DatePercentile] = await structure_output(
            reasoning,
            list[DatePercentile],
            model=self.get_llm("parser", "llm"),
            additional_instructions=parsing_instructions,
            num_validation_samples=self._structure_output_validation_samples,
        )
        percentile_list = [
            Percentile(percentile=p.percentile, value=p.value.timestamp()) for p in date_percentile_list
        ]
        prediction = NumericDistribution.from_question(percentile_list, question)
        logger.info("Forecasted %s: %s", question.page_url, prediction.declared_percentiles)
        return ReasonedPrediction(prediction_value=prediction, reasoning=reasoning)

    def _create_upper_and_lower_bound_messages(
        self, question: NumericQuestion | DateQuestion
    ) -> tuple[str, str]:
        if isinstance(question, NumericQuestion):
            upper_bound_number = (
                question.nominal_upper_bound if question.nominal_upper_bound is not None else question.upper_bound
            )
            lower_bound_number = (
                question.nominal_lower_bound if question.nominal_lower_bound is not None else question.lower_bound
            )
            unit_of_measure = question.unit_of_measure
        elif isinstance(question, DateQuestion):
            upper_bound_number = question.upper_bound.date().isoformat()
            lower_bound_number = question.lower_bound.date().isoformat()
            unit_of_measure = ""
        else:
            raise ValueError()

        if question.open_upper_bound:
            upper_bound_message = f"The question creator thinks the number is likely not higher than {upper_bound_number} {unit_of_measure}."
        else:
            upper_bound_message = f"The outcome can not be higher than {upper_bound_number} {unit_of_measure}."
        if question.open_lower_bound:
            lower_bound_message = f"The question creator thinks the number is likely not lower than {lower_bound_number} {unit_of_measure}."
        else:
            lower_bound_message = f"The outcome can not be lower than {lower_bound_number} {unit_of_measure}."
        return upper_bound_message, lower_bound_message

    # ------------------------------------------------------------ conditional
    async def _run_forecast_on_conditional(
        self, question: ConditionalQuestion, research: str
    ) -> ReasonedPrediction[ConditionalPrediction]:
        parent_info, full_research = await self._get_question_prediction_info(question.parent, research, "parent")
        child_info, full_research = await self._get_question_prediction_info(question.child, research, "child")
        yes_info, full_research = await self._get_question_prediction_info(question.question_yes, full_research, "yes")
        no_info, full_research = await self._get_question_prediction_info(question.question_no, full_research, "no")
        full_reasoning = clean_indents(
            f"""
            ## Parent Question Reasoning
            {parent_info.reasoning}
            ## Child Question Reasoning
            {child_info.reasoning}
            ## Yes Question Reasoning
            {yes_info.reasoning}
            ## No Question Reasoning
            {no_info.reasoning}
            """
        )
        full_prediction = ConditionalPrediction(
            parent=parent_info.prediction_value,  # type: ignore
            child=child_info.prediction_value,  # type: ignore
            prediction_yes=yes_info.prediction_value,  # type: ignore
            prediction_no=no_info.prediction_value,  # type: ignore
        )
        return ReasonedPrediction(reasoning=full_reasoning, prediction_value=full_prediction)

    async def _get_question_prediction_info(
        self, question: MetaculusQuestion, research: str, question_type: str
    ) -> tuple[ReasonedPrediction[PredictionTypes | PredictionAffirmed], str]:
        from forecasting_tools.data_models.data_organizer import DataOrganizer

        previous_forecasts = question.previous_forecasts
        if (
            question_type in ["parent", "child"]
            and previous_forecasts
            and question_type not in self.force_reforecast_in_conditional
        ):
            previous_forecast = previous_forecasts[-1]
            now = datetime.now(timezone.utc)
            if previous_forecast.timestamp_end is None or previous_forecast.timestamp_end > now:
                pretty_value = DataOrganizer.get_readable_prediction(previous_forecast)  # type: ignore
                prediction = ReasonedPrediction(
                    prediction_value=PredictionAffirmed(),
                    reasoning=f"Already existing forecast reaffirmed at {pretty_value}.",
                )
                return (prediction, research)  # type: ignore
        info = await self._make_prediction(question, research)
        full_research = self._add_reasoning_to_research(research, info, question_type)
        return info, full_research  # type: ignore

    def _add_reasoning_to_research(
        self, research: str, reasoning: ReasonedPrediction[PredictionTypes], question_type: str
    ) -> str:
        from forecasting_tools.data_models.data_organizer import DataOrganizer

        question_type = question_type.title()
        return clean_indents(
            f"""
            {research}
            ---
            ## {question_type} Question Information
            You have previously forecasted the {question_type} Question to the value: {DataOrganizer.get_readable_prediction(reasoning.prediction_value)}
            This is relevant information for your current forecast, but it is NOT your current forecast, but previous forecasting information that is relevant to your current forecast.
            The reasoning for the {question_type} Question was as such:
            ```
            {reasoning.reasoning}
            ```
            This is absolutely essential: do NOT use this reasoning to re-forecast the {question_type} question.
            """
        )

    def _get_conditional_disclaimer_if_necessary(self, question: MetaculusQuestion) -> str:
        if question.conditional_type not in ["yes", "no"]:
            return ""
        return clean_indents(
            """
            As you are given a conditional question with a parent and child, you are to only forecast the **CHILD** question, given the parent question's resolution.
            You never re-forecast the parent question under any circumstances, but you use probabilistic reasoning, strongly considering the parent question's resolution, to forecast the child question.
            """
        )


# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------

RunMode = Literal["tournament", "metaculus_cup", "test_questions"]


def _real_env(name: str) -> bool:
    v = (os.getenv(name) or "").strip()
    return bool(v) and v != "REPLACE_ME"


def check_environment() -> None:
    if not _real_env("METACULUS_TOKEN"):
        print("METACULUS_TOKEN missing — the bot cannot read questions or post forecasts.", file=sys.stderr)
        sys.exit(2)
    if not any(_real_env(k) for k in ("OPENROUTER_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY")):
        logger.warning("No LLM key set; forecasting-tools will use the Metaculus proxy (metaculus/gpt-4o).")


# ----------------------------------------------------------------------------
# 模型配置(2026-09-07 首跑事故之后从「靠库的默认」改为「显式钉死」)
# ----------------------------------------------------------------------------

DEFAULT_PROXY_MODEL = "metaculus/gpt-4o"


def _llm_config() -> dict:
    """Pin every LLM role.

    Metaculus 的赞助额度是**按模型名**发的(申请方式见 README),所以「用哪个模型」
    不能交给库去猜:首跑就是被 `openai/gpt-4o-search-preview` 这个没人申请过的默认值
    打成 10 道题全 400。

    研究步默认也用普通模型而不是带 web search 的那种 —— 同样是额度按模型名给,
    带搜索的那些几乎肯定没有额度。研究质量因此下降,但 house prior 仍然注入,
    而那才是本 bot 相对模板的差异所在。要更好的研究步就设 OPENROUTER_API_KEY
    或 BOT_RESEARCHER(例如 asknews/news-summaries,需要 AskNews 密钥)。
    """
    if _real_env("BOT_MODEL"):
        model = os.environ["BOT_MODEL"].strip()
    elif _real_env("ANTHROPIC_API_KEY"):
        # 2026-09-14: owner's own key beats waiting for sponsored credits. Sonnet for the forecast,
        # Haiku for parsing/summaries; both overridable via BOT_MODEL / BOT_PARSER_MODEL.
        model = "anthropic/claude-sonnet-5"
    elif _real_env("OPENROUTER_API_KEY"):
        model = "openrouter/openai/gpt-4o"
    else:
        model = DEFAULT_PROXY_MODEL
    small = (os.getenv("BOT_PARSER_MODEL") or "").strip() or ("anthropic/claude-haiku-4-5-20251001" if model.startswith("anthropic/") else model)
    researcher = (os.getenv("BOT_RESEARCHER") or "").strip() or model
    logger.info("llms: default=%s parser=%s researcher=%s", model, small, researcher)
    return {
        "default": GeneralLlm(model=model, temperature=0.3, timeout=60, allowed_tries=2),
        "summarizer": small,
        "parser": small,
        "researcher": researcher,
    }



def diagnose(bad: list) -> None:
    """把最常见的几类失败翻译成一句能照做的话。

    一屏 tenacity/litellm 的 traceback 里,真正有用的只有一行。首跑那次是
    「no allowance for model」,而它离「去申请额度或换模型」还隔着二十层调用栈。
    """
    blob = " ".join(str(e) for e in bad).lower()
    if not blob:
        return
    if "allowance" in blob or "insufficient_quota" in blob or "quota" in blob:
        print("\n诊断:Metaculus 代理的赞助额度是**按模型名**发的,当前用的模型没有额度。")
        print("  三条出路,任选其一:")
        print("  1) 设仓库变量 BOT_MODEL 换成一个你确实有额度的模型名;")
        print("  2) 按 Metaculus 说明发邮件给 ben@metaculus.com 申请额度(说明 bot 用途与所需模型);")
        print("  3) 设 Secret OPENROUTER_API_KEY(免费额度表单在 tools/metaculus-bot/README.md),")
        print("     设了之后本脚本自动改走 openrouter/openai/gpt-4o。")
    elif "unauthorized" in blob or "401" in blob or "invalid token" in blob:
        print("\n诊断:METACULUS_TOKEN 无效或已过期 —— 去 Settings → My Forecasting Bots 重新 Reveal API Key。")
    elif "rate limit" in blob or "429" in blob:
        print("\n诊断:被限流。这一轮不用管,下一次 cron 会重试;连续多轮如此再调低并发。")



def summarize(reports: list, publish: bool, mode: str) -> int:
    ok = [r for r in reports if isinstance(r, ForecastReport)]
    bad = [r for r in reports if not isinstance(r, ForecastReport)]
    print("=" * 72)
    print(f"mode={mode} publish={'yes' if publish else 'no (dry run)'} forecasts={len(ok)} failures={len(bad)}")
    for r in ok:
        try:
            print(f"  ✓ {r.question.page_url}")
        except Exception:
            print("  ✓ (report without url)")
    for e in bad:
        print(f"  ✗ {type(e).__name__}: {str(e)[:200]}")
    diagnose(bad)
    print("=" * 72)
    # Red-on-empty: questions existed, every one failed → make the run fail.
    if bad and not ok:
        return 1
    return 0


def _tournament_id(env_name: str, default):
    v = (os.getenv(env_name) or "").strip()
    if not v:
        return default
    return int(v) if v.isdigit() else v


class _NoCap:
    current_usage = None
    def __enter__(self): return self
    def __exit__(self, *a): return False


def _spend_cap(max_usd: float):
    """forecasting-tools' MonetaryCostManager raises once tracked LLM spend passes max_usd — the hard stop
    that makes running on the owner's own key safe on a 2-hourly cron. Falls back to no cap (with a log
    line) if the library version lacks it; never silently."""
    try:
        from forecasting_tools import MonetaryCostManager  # type: ignore
        return MonetaryCostManager(max_usd)
    except Exception as e:  # pragma: no cover
        logger.warning("MonetaryCostManager unavailable (%s) — running WITHOUT a spend cap", e)
        return _NoCap()


def _spend_str(cm) -> str:
    try:
        return "$%.4f" % float(cm.current_usage)
    except Exception:
        return "untracked"


def main() -> int:
    parser = argparse.ArgumentParser(description="Fleet Metaculus forecasting bot")
    parser.add_argument("--mode", choices=["tournament", "metaculus_cup", "test_questions"], default="tournament")
    parser.add_argument("--dry-run", action="store_true", help="never publish forecasts")
    args = parser.parse_args()
    run_mode: RunMode = args.mode
    publish = not args.dry_run and os.getenv("METACULUS_BOT_PUBLISH", "1") != "0"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    for noisy in ("LiteLLM", "httpx", "httpcore", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    check_environment()

    bot = FleetForecastBot(
        research_reports_per_question=1,
        predictions_per_research_report=5,
        use_research_summary_to_forecast=False,
        publish_reports_to_metaculus=publish,
        folder_to_save_reports_to=None,
        skip_previously_forecasted_questions=(run_mode == "tournament"),
        extra_metadata_in_explanation=True,
        llms=_llm_config(),
    )

    client = MetaculusClient()
    # 2026-09-14: the pinned forecasting-tools (0.2.92) still points CURRENT_AI_COMPETITION_ID at the
    # Summer 2026 season (33022), which stopped opening questions before 2026-09-01. The live season is
    # Fall 2026 = project 33121 (slug fall-futureeval-2026). Ids are env-overridable so a new season is a
    # variable change, not a code change; MiniBench keeps the library constant unless overridden.
    main_id = _tournament_id("BOT_TOURNAMENT_ID", 33121)
    mini_id = _tournament_id("BOT_MINIBENCH_ID", client.CURRENT_MINIBENCH_ID)
    cap = float(os.getenv("BOT_MAX_USD_PER_RUN") or "3")
    logger.info("tournaments: main=%s minibench=%s; spend cap per run: $%.2f", main_id, mini_id, cap)
    if run_mode == "tournament":
        with _spend_cap(cap) as cm:
            reports = asyncio.run(bot.forecast_on_tournament(main_id, return_exceptions=True))
            n_main = len(reports)
            reports += asyncio.run(bot.forecast_on_tournament(mini_id, return_exceptions=True))
        logger.info("questions touched: main=%d minibench=%d; spend this run: %s", n_main, len(reports) - n_main, _spend_str(cm))
        if n_main == 0:
            print("::warning::0 questions came back for the main tournament id %s — either nothing new (skip_previously_forecasted) or the season id is stale; check BOT_TOURNAMENT_ID" % main_id)
    elif run_mode == "metaculus_cup":
        reports = asyncio.run(bot.forecast_on_tournament(client.CURRENT_METACULUS_CUP_ID, return_exceptions=True))
    else:
        reports = asyncio.run(bot.forecast_on_tournament("bot-testing-area", return_exceptions=True))

    try:
        bot.log_report_summary(reports)
    except Exception as e:
        # forecasting-tools 在有任何失败时会 raise,于是我们自己的诊断和退出码永远轮不到跑
        # —— 首跑看到的就是一屏 traceback 而不是一行「问题在这」。它只是打印器,不该决定命运。
        logger.warning("log_report_summary raised (%s); continuing to our own summary", type(e).__name__)
    return summarize(reports, publish, run_mode)


if __name__ == "__main__":
    sys.exit(main())
