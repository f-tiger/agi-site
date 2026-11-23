#!/usr/bin/env python3
"""Build the three locale variants of the fleet contact template."""

import argparse
import html
import json
from pathlib import Path

SITE = Path(__file__).resolve().parents[1]
ORIGIN = "https://agiscorecard.com"
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
        "description": "Contact the teams behind AGI Scorecard, BPJ, EcoBack and The Doll Scout about investment and partnerships.",
        "language_navigation": "Languages",
        "instructions": "Choose the project you want to discuss. Tell us who you are and what you have in mind.",
        "privacy_note": "Sending forwards your form and reply email to the project team so they can follow up.",
        "project": "Project",
        "type": "Interest",
        "types": {"INVESTMENT": "Investment", "PARTNERSHIP": "Partnership"},
        "name": "Your name or organization",
        "reply_email": "Email for replies",
        "proposal": "What would you like to discuss?",
        "proposal_hint": "A short outline of your investment interest or partnership idea is enough.",
        "website": "Public website (optional)",
        "timing": "Preferred timing (optional)",
        "sitePrivacy": "Privacy",
        "send": "Send inquiry",
        "check": "Check sending again",
        "copy": "Copy email template",
        "checking": "Checking whether inquiries can be sent…",
        "check_failed": "Could not check email availability. Check again to enable sending.",
        "unavailable": "Email forwarding is temporarily unavailable. You can keep editing and check again.",
        "sending": "Submitting your inquiry…",
        "accepted": "Your inquiry was accepted for email forwarding.",
        "invalid_submission": "Check the form fields and try again.",
        "rate_limited": "Too many attempts. Please wait before trying again.",
        "unconfirmed": "Email forwarding could not be confirmed. Your form is still here so you can retry.",
        "copied": "Email template copied.",
        "manual": "Select and copy the template below.",
        "noscript": "Enable JavaScript to submit an inquiry online. The template below shows what to prepare.",
        "outline": "Prepare your name or organization, reply email and proposal. A public website and preferred timing are optional.",
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
        "description": "联系 AGI Scorecard、BPJ 白嫖计、EcoBack 或 The Doll Scout 团队，提交投资或合作意向。",
        "language_navigation": "语言",
        "instructions": "先选择你想洽谈的项目，再简单介绍自己和你的意向。",
        "privacy_note": "发送时，表单内容和回复邮箱会通过邮件转交项目团队，方便后续联系。",
        "project": "意向项目",
        "type": "意向类型",
        "types": {"INVESTMENT": "投资", "PARTNERSHIP": "合作"},
        "name": "姓名或机构",
        "reply_email": "回复邮箱",
        "proposal": "你想谈什么？",
        "proposal_hint": "简单说说你的投资意向或合作想法即可。",
        "website": "公开官网（选填）",
        "timing": "期望沟通时间（选填）",
        "sitePrivacy": "隐私政策",
        "send": "发送意向",
        "check": "重新检查发送状态",
        "copy": "复制邮件模板",
        "checking": "正在检查能否发送意向…",
        "check_failed": "暂时无法检查邮件服务。请重新检查以启用发送。",
        "unavailable": "邮件转送暂时不可用。你可以继续填写，并重新检查发送状态。",
        "sending": "正在提交意向…",
        "accepted": "你的意向已受理，将通过邮件转送。",
        "invalid_submission": "请核对表单内容后重试。",
        "rate_limited": "操作过于频繁。请稍后重试。",
        "unconfirmed": "暂时无法确认邮件转送。填写内容已保留，你可以重试。",
        "copied": "已复制邮件模板。",
        "manual": "请选中并复制下方模板。",
        "noscript": "在线提交需要 JavaScript。你仍可查看下方模板，先准备相关信息。",
        "outline": "请准备姓名或机构、回复邮箱和意向简述。公开官网和期望沟通时间可选填。",
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
        "description": "Kontaktieren Sie die Teams von AGI Scorecard, BPJ, EcoBack oder The Doll Scout zu Investitionen oder Partnerschaften.",
        "language_navigation": "Sprachen",
        "instructions": "Wählen Sie ein Projekt und beschreiben Sie kurz, wer Sie sind und worüber Sie sprechen möchten.",
        "privacy_note": "Beim Senden erhält das Projektteam Ihre Angaben und Ihre E-Mail-Adresse zur Kontaktaufnahme.",
        "project": "Projekt",
        "type": "Interesse",
        "types": {"INVESTMENT": "Investition", "PARTNERSHIP": "Partnerschaft"},
        "name": "Ihr Name oder Ihre Organisation",
        "reply_email": "E-Mail-Adresse für die Antwort",
        "proposal": "Worüber möchten Sie sprechen?",
        "proposal_hint": "Eine kurze Beschreibung Ihres Interesses oder Ihrer Partnerschaftsidee genügt.",
        "website": "Öffentliche Website (optional)",
        "timing": "Bevorzugter Zeitpunkt (optional)",
        "sitePrivacy": "Datenschutz",
        "send": "Anfrage senden",
        "check": "Versand erneut prüfen",
        "copy": "E-Mail-Vorlage kopieren",
        "checking": "Der Versandstatus wird geprüft…",
        "check_failed": "Der Versandstatus konnte nicht geprüft werden. Starten Sie die Prüfung erneut.",
        "unavailable": "Die Weiterleitung ist vorübergehend nicht verfügbar. Sie können das Formular weiter ausfüllen und den Status erneut prüfen.",
        "sending": "Ihre Anfrage wird übermittelt…",
        "accepted": "Ihre Anfrage wurde zur Weiterleitung per E-Mail angenommen.",
        "invalid_submission": "Prüfen Sie die Angaben im Formular und versuchen Sie es erneut.",
        "rate_limited": "Zu viele Versuche. Warten Sie bitte, bevor Sie es erneut versuchen.",
        "unconfirmed": "Die Weiterleitung konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten und Sie können es erneut versuchen.",
        "copied": "E-Mail-Vorlage kopiert.",
        "manual": "Markieren und kopieren Sie die Vorlage unten.",
        "noscript": "Für eine Online-Anfrage benötigen Sie JavaScript. Die Vorlage zeigt, welche Angaben Sie vorbereiten können.",
        "outline": "Halten Sie Ihren Namen oder Ihre Organisation, Ihre Antwortadresse und eine kurze Beschreibung bereit. Website und Zeitpunkt sind optional.",
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


def build(locale):
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
    static_template = "\n\n".join([
        t["subject_label"] + "\nAGIFLEETINVESTV1 [PROJECT] [INTEREST]",
        t["greeting"], t["name"] + "\n…", t["reply_email"] + "\n…",
        t["project"] + "\n…", t["type"] + "\n…",
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
    <p class="contact-note">{t['privacy_note']}</p>
  </section>
  <section class="contact-letter" aria-label="{t['preview']}">
    <form id="contact-form" action="/api/investment-contact" method="post" hidden
      data-greeting="{t['greeting']}" data-thanks="{t['thanks']}"
      data-subject-label="{t['subject_label']}" data-copied="{t['copied']}"
      data-manual="{t['manual']}" data-checking="{t['checking']}"
      data-check-failed="{t['check_failed']}" data-unavailable="{t['unavailable']}"
      data-sending="{t['sending']}" data-accepted="{t['accepted']}"
      data-invalid-submission="{t['invalid_submission']}" data-rate-limited="{t['rate_limited']}"
      data-unconfirmed="{t['unconfirmed']}"
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
          <label for="contact-reply-email">{t['reply_email']}</label>
          <input id="contact-reply-email" type="email" required maxlength="254" autocomplete="email">
        </div>
        <div hidden aria-hidden="true">
          <input id="contact-website-check" name="websiteCheck" type="text" maxlength="180" autocomplete="off" tabindex="-1">
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
          <button type="submit" id="contact-send" disabled>{t['send']}</button>
          <button type="button" id="contact-copy" class="contact-copy">{t['copy']}</button>
          <button type="button" id="contact-check" class="contact-copy" hidden>{t['check']}</button>
        </div>
      </fieldset>
      <p id="contact-availability" class="contact-note" role="status" hidden></p>
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
    args = parser.parse_args()
    for locale in LOCALES:
        target = SITE / (path(locale).lstrip("/") + ".html")
        page = build(locale)
        existing = target.read_text(encoding="utf-8") if target.is_file() else ""
        if page == existing:
            continue
        if args.check:
            raise SystemExit(f"Contact page needs regeneration: {target.relative_to(SITE)}")
        target.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
