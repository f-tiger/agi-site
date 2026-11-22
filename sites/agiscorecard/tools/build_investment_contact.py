#!/usr/bin/env python3
"""Build the three locale variants of the fleet contact template."""

import argparse
import html
import json
import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
ORIGIN = "https://agiscorecard.com"
RECIPIENT_PATTERN = re.compile(
    r"[a-zA-Z0-9._+-]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}",
    re.ASCII,
)
PROJECTS = {
    "AGI": "AGI Scorecard",
    "BPJ": "BPJ / 白嫖计",
    "ECO": "EcoBack",
    "TDS": "The Doll Scout",
}
LOCALES = {
    "en": {
        "prefix": "", "home": "/", "privacy": "/privacy", "lang_name": "English",
        "title": "Investment and partnerships",
        "description": "Prepare an investment or partnership email for AGI Scorecard, BPJ, EcoBack or The Doll Scout.",
        "language_navigation": "Languages",
        "instructions": "Choose the project you want to discuss. Tell us who you are and what you have in mind.",
        "local": "Your fields stay in this browser. Send the draft from your own email app when it is ready.",
        "project": "Project",
        "type": "Interest",
        "types": {"INVESTMENT": "Investment", "PARTNERSHIP": "Partnership"},
        "name": "Your name or organization",
        "proposal": "What would you like to discuss?",
        "proposal_hint": "A short outline of your investment interest or partnership idea is enough.",
        "website": "Public website (optional)",
        "timing": "Preferred timing (optional)",
        "sitePrivacy": "Privacy",
        "draft": "Open email draft",
        "copy": "Copy email template",
        "draft_opened": "Draft requested. Review it in your email app and send it there.",
        "copied": "Email template copied.",
        "manual": "Select and copy the template below.",
        "empty_recipient": "The contact address is awaiting confirmation. You can copy the template to keep it ready.",
        "recipient_label": "Contact address",
        "noscript": "Use the outline below to prepare your email. Enable JavaScript to prefill a draft from the form.",
        "outline": "Use AGIFLEETINVESTV1 in the subject, followed by the project code [AGI], [BPJ], [ECO] or [TDS] and the interest [INVESTMENT] or [PARTNERSHIP]. Include your name or organization and your proposal. A public website and preferred timing are optional.",
        "preview": "Email template",
        "greeting": "Hello,",
        "thanks": "Thank you.",
        "subject_label": "Subject",
        "invalid_url": "Use a public http or https website address.",
        "invalid_text": "Add a name or organization and a short proposal.",
    },
    "zh": {
        "prefix": "/zh", "home": "/cn", "privacy": "/privacy", "lang_name": "中文",
        "title": "投资与合作",
        "description": "为 AGI Scorecard、BPJ 白嫖计、EcoBack 或 The Doll Scout 准备投资或合作邮件。",
        "language_navigation": "语言",
        "instructions": "先选择你想洽谈的项目，再简单介绍自己和你的意向。",
        "local": "你填写的内容保留在当前浏览器。草稿准备好后，由你在自己的邮件应用中发送。",
        "project": "意向项目",
        "type": "意向类型",
        "types": {"INVESTMENT": "投资", "PARTNERSHIP": "合作"},
        "name": "姓名或机构",
        "proposal": "你想谈什么？",
        "proposal_hint": "简单说说你的投资意向或合作想法即可。",
        "website": "公开官网（选填）",
        "timing": "期望沟通时间（选填）",
        "sitePrivacy": "隐私政策",
        "draft": "打开邮件草稿",
        "copy": "复制邮件模板",
        "draft_opened": "已请求打开邮件草稿。请在邮件应用中核对后发送。",
        "copied": "已复制邮件模板。",
        "manual": "请选中并复制下方模板。",
        "empty_recipient": "收件地址待确认。你可以先复制邮件模板。",
        "recipient_label": "收件地址",
        "noscript": "可以按下方提纲准备邮件。启用 JavaScript 后可从表单直接填好草稿。",
        "outline": "邮件主题以 AGIFLEETINVESTV1 开头，再加项目代码 [AGI]、[BPJ]、[ECO] 或 [TDS]，以及意向 [INVESTMENT] 或 [PARTNERSHIP]。正文写明姓名或机构和意向简述。公开官网与期望沟通时间选填。",
        "preview": "邮件模板",
        "greeting": "你好！",
        "thanks": "谢谢。",
        "subject_label": "邮件主题",
        "invalid_url": "请填写以 http 或 https 开头的公开官网地址。",
        "invalid_text": "请填写姓名或机构和意向简述。",
    },
    "de": {
        "prefix": "/de", "home": "/", "privacy": "/privacy", "lang_name": "Deutsch",
        "title": "Investitionen und Partnerschaften",
        "description": "Bereiten Sie eine E-Mail zu Investitionen oder Partnerschaften mit AGI Scorecard, BPJ, EcoBack oder The Doll Scout vor.",
        "language_navigation": "Sprachen",
        "instructions": "Wählen Sie ein Projekt und beschreiben Sie kurz, wer Sie sind und worüber Sie sprechen möchten.",
        "local": "Ihre Eingaben bleiben in diesem Browser. Senden Sie den Entwurf anschließend über Ihr eigenes E-Mail-Programm.",
        "project": "Projekt",
        "type": "Interesse",
        "types": {"INVESTMENT": "Investition", "PARTNERSHIP": "Partnerschaft"},
        "name": "Ihr Name oder Ihre Organisation",
        "proposal": "Worüber möchten Sie sprechen?",
        "proposal_hint": "Eine kurze Beschreibung Ihres Interesses oder Ihrer Partnerschaftsidee genügt.",
        "website": "Öffentliche Website (optional)",
        "timing": "Bevorzugter Zeitpunkt (optional)",
        "sitePrivacy": "Datenschutz",
        "draft": "E-Mail-Entwurf öffnen",
        "copy": "E-Mail-Vorlage kopieren",
        "draft_opened": "Der Entwurf wurde angefordert. Prüfen und senden Sie ihn in Ihrem E-Mail-Programm.",
        "copied": "E-Mail-Vorlage kopiert.",
        "manual": "Markieren und kopieren Sie die Vorlage unten.",
        "empty_recipient": "Die Kontaktadresse wird noch bestätigt. Sie können die Vorlage bereits kopieren.",
        "recipient_label": "Kontaktadresse",
        "noscript": "Nutzen Sie die untenstehende Anleitung. Aktivieren Sie JavaScript, um mit dem Formular einen Entwurf zu öffnen.",
        "outline": "Beginnen Sie den Betreff mit AGIFLEETINVESTV1, gefolgt vom Projektcode [AGI], [BPJ], [ECO] oder [TDS] und dem Interesse [INVESTMENT] oder [PARTNERSHIP]. Nennen Sie Ihren Namen oder Ihre Organisation und beschreiben Sie Ihr Vorhaben. Website und Zeitpunkt sind optional.",
        "preview": "E-Mail-Vorlage",
        "greeting": "Guten Tag,",
        "thanks": "Vielen Dank.",
        "subject_label": "Betreff",
        "invalid_url": "Geben Sie eine öffentliche Website mit http oder https an.",
        "invalid_text": "Geben Sie Ihren Namen oder Ihre Organisation und ein kurzes Vorhaben an.",
    },
}


def esc(value):
    return html.escape(value, quote=True)


def path(locale):
    return LOCALES[locale]["prefix"] + "/investment-contact"


def load_recipient():
    config = json.loads((SITE / "tools" / "investment_contact_settings.json").read_text(encoding="utf-8"))
    if not isinstance(config, dict) or set(config) != {"recipient"}:
        raise ValueError("The contact settings require only a recipient field.")
    recipient = config["recipient"]
    if not isinstance(recipient, str):
        raise ValueError("The contact recipient must be text.")
    if recipient and (
        len(recipient) > 254
        or not RECIPIENT_PATTERN.fullmatch(recipient)
        or ".." in recipient.split("@", 1)[0]
        or recipient.startswith(".")
        or ".@" in recipient
    ):
        raise ValueError("The contact recipient must be one valid email address.")
    return recipient


def build(locale, recipient):
    t = {key: esc(value) for key, value in LOCALES[locale].items() if isinstance(value, str)}
    title = t["title"] + " | AGI Scorecard"
    canonical = ORIGIN + path(locale)
    locale_links = "\n".join(
        f'<link rel="alternate" hreflang="{code}" href="{ORIGIN}{path(code)}">' for code in LOCALES
    )
    language_navigation = "\n".join(
        f'      <a href="{path(code)}" hreflang="{code}" lang="{code}" data-contact-locale'
        + (' aria-current="page"' if code == locale else "")
        + f'>{esc(copy["lang_name"])}</a>'
        for code, copy in LOCALES.items()
    )
    project_options = "".join(f'<option value="{code}">{esc(label)}</option>' for code, label in PROJECTS.items())
    type_options = "".join(f'<option value="{code}">{esc(label)}</option>' for code, label in LOCALES[locale]["types"].items())
    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": LOCALES[locale]["title"],
        "description": LOCALES[locale]["description"],
        "url": canonical,
        "inLanguage": locale,
        "isPartOf": {"@type": "WebSite", "name": "AGI Scorecard", "url": ORIGIN},
    }, ensure_ascii=False).replace("<", "\\u003c")
    contact_info = (
        f'<p class="contact-recipient">{t["recipient_label"]}<br><span>{esc(recipient)}</span></p>'
        if recipient else f'<p class="contact-recipient">{t["empty_recipient"]}</p>'
    )
    static_template = "\n\n".join([
        t["subject_label"] + "\nAGIFLEETINVESTV1 [PROJECT] [INTEREST]",
        t["greeting"], t["name"] + "\n…", t["project"] + "\n…", t["type"] + "\n…",
        t["proposal"] + "\n…", t["website"] + "\n…", t["timing"] + "\n…", t["thanks"],
    ])
    return f"""<!doctype html>
<html lang="{locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{t['description']}">
<link rel="canonical" href="{canonical}">
{locale_links}
<link rel="alternate" hreflang="x-default" href="{ORIGIN}{path('en')}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{t['description']}">
<meta property="og:url" content="{canonical}">
<link rel="stylesheet" href="/investment-contact-assets/style.css">
<script type="application/ld+json">{schema}</script>
<script type="module" src="/investment-contact-assets/form.mjs"></script>
</head>
<body>
<header class="contact-header">
  <a class="contact-brand" href="{t['home']}">AGI Scorecard</a>
  <nav class="contact-languages" aria-label="{t['language_navigation']}">
{language_navigation}
  </nav>
</header>
<main class="contact-main">
  <section class="contact-brief">
    <h1>{t['title']}</h1>
    <p>{t['instructions']}</p>
    <p class="contact-note">{t['local']}</p>
    {contact_info}
  </section>
  <section class="contact-letter" aria-label="{t['preview']}">
    <form id="contact-form" method="post" data-recipient="{esc(recipient)}"
      data-greeting="{t['greeting']}" data-thanks="{t['thanks']}"
      data-subject-label="{t['subject_label']}" data-copied="{t['copied']}"
      data-manual="{t['manual']}" data-draft-opened="{t['draft_opened']}"
      data-invalid-url="{t['invalid_url']}" data-invalid-text="{t['invalid_text']}">
      <fieldset disabled>
        <legend class="sr-only">{t['preview']}</legend>
        <div class="contact-pair">
          <div>
            <label for="contact-project">{t['project']}</label>
            <select id="contact-project">{project_options}</select>
          </div>
          <div>
            <label for="contact-type">{t['type']}</label>
            <select id="contact-type">{type_options}</select>
          </div>
        </div>
        <div>
          <label for="contact-name">{t['name']}</label>
          <input id="contact-name" type="text" required maxlength="100" autocomplete="organization">
        </div>
        <div>
          <label for="contact-proposal">{t['proposal']}</label>
          <textarea id="contact-proposal" required maxlength="600" rows="4" aria-describedby="contact-proposal-hint"></textarea>
          <p id="contact-proposal-hint" class="contact-note">{t['proposal_hint']}</p>
        </div>
        <div class="contact-pair contact-final-pair">
          <div>
            <label for="contact-website">{t['website']}</label>
            <input id="contact-website" type="url" maxlength="180" inputmode="url" autocomplete="url">
          </div>
          <div>
            <label for="contact-timing">{t['timing']}</label>
            <input id="contact-timing" type="text" maxlength="100">
          </div>
        </div>
        <div class="contact-actions">
          {f'<button type="submit">{t["draft"]}</button>' if recipient else ""}
          <button type="button" id="contact-copy" class="contact-copy">{t['copy']}</button>
        </div>
      </fieldset>
      <p id="contact-status" role="status" hidden></p>
      <div id="contact-preview" hidden>
        <label for="contact-template">{t['preview']}</label>
        <textarea id="contact-template" readonly rows="8"></textarea>
      </div>
    </form>
    <noscript>
      <p class="contact-note">{t['noscript']}</p>
    </noscript>
    <details class="contact-outline">
      <summary>{t['preview']}</summary>
      <p>{t['outline']}</p>
      <pre>{static_template}</pre>
    </details>
  </section>
</main>
<footer class="contact-footer">
  <a href="{t['home']}">AGI Scorecard</a>
  <a href="{t['privacy']}">{t['sitePrivacy']}</a>
</footer>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--require-recipient", action="store_true")
    args = parser.parse_args()
    recipient = load_recipient()
    if args.require_recipient and not recipient:
        raise SystemExit("Confirm and configure an approved public contact recipient before deployment.")
    for locale in LOCALES:
        target = SITE / (path(locale).lstrip("/") + ".html")
        page = build(locale, recipient)
        existing = target.read_text(encoding="utf-8") if target.is_file() else ""
        if page == existing:
            continue
        if args.check:
            raise SystemExit(f"Contact page needs regeneration: {target.relative_to(SITE)}")
        target.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
