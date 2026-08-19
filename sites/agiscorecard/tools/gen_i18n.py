# -*- coding: utf-8 -*-
"""Multilingual expansion generator. Translates high-value EN head-term pages into
the site's 7 Latin/CJK language dirs (es/fr/de/pt/it/ja/ko), matching the existing
localized template EXACTLY (same CSS, header, langbar, Article+FAQPage JSON-LD,
8-lang hreflang cluster incl. zh-Hans + x-default) AND adding the localized subscribe
CTA the older localized pages were missing (conversion gap). Verified site data only —
faithful translations of the EN source, no invented statistics.
Run: python3 tools/gen_i18n.py"""
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GA = "G-FZXLMBB5QB"
DATE = "2026-07-16"
LANGS = ["es", "fr", "de", "pt", "it", "ja", "ko"]  # zh + en handled separately
LOCALE = {"es": "es_ES", "fr": "fr_FR", "de": "de_DE", "pt": "pt_BR", "it": "it_IT", "ja": "ja_JP", "ko": "ko_KR"}
LABEL = {"es": "ES", "fr": "FR", "de": "DE", "pt": "PT", "it": "IT", "ja": "日本語", "ko": "한국어"}

# Localized chrome strings shared by every page.
UI = {
  "es": {"updated": "Última actualización", "faq": "Preguntas frecuentes", "related": "Relacionado",
         "sub_h": "Recibe el informe semanal sobre la AGI", "sub_p": "Cambios de veredicto e hitos, y qué significan para el reloj de 2027. Gratis, sin ruido.",
         "sub_b": "Suscríbete gratis →", "back": "Ver el scorecard en vivo →", "foot": "Seguimiento independiente de", "notaff": "No afiliado a ningún laboratorio", "test": "¿Qué tipo de AGI eres? Haz el test de 30 segundos →"},
  "fr": {"updated": "Dernière mise à jour", "faq": "Questions fréquentes", "related": "À lire aussi",
         "sub_h": "Recevez le point hebdomadaire sur l'AGI", "sub_p": "Changements de verdict et jalons, et ce qu'ils signifient pour l'échéance 2027. Gratuit, sans bruit.",
         "sub_b": "S'abonner gratuitement →", "back": "Voir le scorecard en direct →", "foot": "Suivi indépendant de", "notaff": "Sans affiliation à un laboratoire", "test": "Quel est votre type d'AGI ? Faites le test de 30 secondes →"},
  "de": {"updated": "Zuletzt aktualisiert", "faq": "Häufige Fragen", "related": "Verwandt",
         "sub_h": "Das wöchentliche AGI-Briefing", "sub_p": "Verdict-Änderungen und Meilensteine – und was sie für die 2027-Uhr bedeuten. Kostenlos, kein Hype.",
         "sub_b": "Kostenlos abonnieren →", "back": "Live-Scorecard ansehen →", "foot": "Unabhängiges Tracking von", "notaff": "Keinem Labor zugehörig", "test": "Welcher AGI-Typ bist du? Mach den 30-Sekunden-Test →"},
  "pt": {"updated": "Última atualização", "faq": "Perguntas frequentes", "related": "Relacionado",
         "sub_h": "Receba o resumo semanal sobre AGI", "sub_p": "Mudanças de veredito e marcos, e o que significam para o relógio de 2027. Grátis, sem ruído.",
         "sub_b": "Assine grátis →", "back": "Ver o scorecard ao vivo →", "foot": "Acompanhamento independente de", "notaff": "Sem afiliação a nenhum laboratório", "test": "Qual é o seu tipo de AGI? Faça o teste de 30 segundos →"},
  "it": {"updated": "Ultimo aggiornamento", "faq": "Domande frequenti", "related": "Correlati",
         "sub_h": "Ricevi il briefing settimanale sull'AGI", "sub_p": "Cambi di verdetto e traguardi, e cosa significano per l'orizzonte 2027. Gratis, senza rumore.",
         "sub_b": "Iscriviti gratis →", "back": "Vedi lo scorecard dal vivo →", "foot": "Monitoraggio indipendente di", "notaff": "Non affiliato ad alcun laboratorio", "test": "Che tipo di AGI sei? Fai il test di 30 secondi →"},
  "ja": {"updated": "最終更新", "faq": "よくある質問", "related": "関連ページ",
         "sub_h": "AGI進捗の週次ブリーフィングを受け取る", "sub_p": "判定の変化とマイルストーン、そして2027年の時計への意味。無料・誇張なし。",
         "sub_b": "無料で購読 →", "back": "ライブ・スコアカードを見る →", "foot": "独立系トラッカー：", "notaff": "いかなる研究所とも無関係", "test": "あなたのAGIタイプは？30秒テストを受ける →"},
  "ko": {"updated": "마지막 업데이트", "faq": "자주 묻는 질문", "related": "관련 글",
         "sub_h": "주간 AGI 브리핑 받기", "sub_p": "판정 변화와 이정표, 그리고 2027 시계에 대한 의미. 무료, 과장 없음.",
         "sub_b": "무료 구독 →", "back": "실시간 스코어카드 보기 →", "foot": "독립 추적:", "notaff": "어떤 연구소와도 무관", "test": "당신의 AGI 유형은? 30초 테스트 하기 →"},
}

# Per-page, per-language content. Faithful translations of the EN source pages.
# Each: title, desc, eyebrow, h1, capsule (html allowed), secs=[(h2,p_html)...],
# table=(h2, [th,th], [[td,td]...]) optional, faqs=[(q,a)...].
PAGES = {}

# ---- what-is-agi ----
PAGES["what-is-agi"] = {
  "zh": True,  # a zh version exists → include zh-Hans in hreflang/langbar
  "en_title": "What is AGI?",
  "es": {
    "title": "¿Qué es la AGI? Definición, plazos y estado actual",
    "desc": "La AGI es una IA capaz de hacer casi cualquier tarea cognitiva de un humano cualificado. Qué significa el término, por qué las definiciones dividen los plazos y dónde está 2026.",
    "eyebrow": "Definición", "h1": "¿Qué es la AGI? La definición detrás de la pelea por los plazos",
    "capsule": '<span class="verdict">IA capaz de hacer el trabajo cognitivo de un humano cualificado — y la definición es la mitad de la pelea.</span> AGI (inteligencia artificial general) suele significar una IA capaz de realizar casi cualquier tarea cognitiva de un profesional humano. Pero cada pronosticador usa un listón distinto — desde «trabajador remoto enchufable» hasta «investigador de IA autónomo» — y esa brecha explica gran parte de por qué los plazos públicos van de 2026 a 2047.',
    "secs": [
      ("Las definiciones que importan", "Dos listones dominan el debate. El <strong>«trabajador remoto enchufable»</strong>: una IA que puede hacer cualquier trabajo de conocimiento a distancia tan bien como un humano competente. Y el <strong>«investigador de IA autónomo»</strong>: un sistema capaz de llevar a cabo investigación de IA de principio a fin por sí solo. El segundo listón es mucho más alto — y es el que dispara las fechas más agresivas, como el 2027 de Aschenbrenner."),
      ("¿Qué NO es la AGI?", "No es un chatbot que responde bien, ni un modelo que supera un examen. El listón es la <strong>generalidad</strong>: rendir en tareas nuevas sin reentrenamiento específico. A mediados de 2026, la IA de frontera resuelve muchas pruebas de trabajo de conocimiento (~83 % en GDPval, ~80 % en SWE-Bench Pro), pero aún no ha cruzado la línea de hacer investigación de IA de forma autónoma."),
    ],
    "faqs": [
      ("¿Qué es la AGI en palabras simples?", "Una IA que puede hacer esencialmente cualquier tarea cognitiva que haría un profesional humano cualificado, no solo una tarea concreta. La discrepancia está en cuán alto se pone ese listón."),
      ("¿Ya existe la AGI en 2026?", "No. La IA de frontera es un asistente muy capaz (~83 % en GDPval, ~80 % en SWE-Bench Pro), pero ningún sistema hace investigación de IA de principio a fin de forma autónoma — el listón que la mayoría considera definitorio."),
      ("¿Por qué las definiciones cambian los plazos?", "Porque un «trabajador remoto enchufable» y un «investigador de IA autónomo» son metas muy distintas. Cuanto más alto el listón, más tarde la fecha — por eso los pronósticos públicos van de 2026 a 2047."),
    ],
  },
  "fr": {
    "title": "Qu'est-ce que l'AGI ? Définition, échéances et état actuel",
    "desc": "L'AGI est une IA capable de réaliser presque toute tâche cognitive d'un humain qualifié. Ce que le terme signifie, pourquoi les définitions divisent les échéances, et où en est 2026.",
    "eyebrow": "Définition", "h1": "Qu'est-ce que l'AGI ? La définition au cœur de la bataille des échéances",
    "capsule": '<span class="verdict">Une IA capable du travail cognitif d\'un humain qualifié — et la définition est la moitié de la bataille.</span> L\'AGI (intelligence artificielle générale) désigne généralement une IA capable de réaliser presque toute tâche cognitive d\'un professionnel humain. Mais chaque prévisionniste utilise un seuil différent — du « travailleur à distance interchangeable » au « chercheur en IA autonome » — et cet écart explique en grande partie pourquoi les échéances publiques vont de 2026 à 2047.',
    "secs": [
      ("Les définitions qui comptent", "Deux seuils dominent le débat. Le <strong>« travailleur à distance interchangeable »</strong> : une IA capable de faire n'importe quel travail intellectuel à distance aussi bien qu'un humain compétent. Et le <strong>« chercheur en IA autonome »</strong> : un système capable de mener une recherche en IA de bout en bout, seul. Le second seuil est bien plus élevé — et c'est lui qui déclenche les dates les plus agressives, comme le 2027 d'Aschenbrenner."),
      ("Ce que l'AGI n'est PAS", "Ce n'est pas un chatbot qui répond bien, ni un modèle qui réussit un examen. Le seuil, c'est la <strong>généralité</strong> : réussir des tâches nouvelles sans réentraînement dédié. Mi-2026, l'IA de pointe franchit de nombreux tests de travail intellectuel (~83 % sur GDPval, ~80 % sur SWE-Bench Pro), mais n'a pas encore franchi la ligne de la recherche en IA autonome."),
    ],
    "faqs": [
      ("Qu'est-ce que l'AGI en termes simples ?", "Une IA capable de réaliser essentiellement n'importe quelle tâche cognitive d'un professionnel humain qualifié, pas seulement une tâche précise. Le désaccord porte sur la hauteur de ce seuil."),
      ("L'AGI existe-t-elle déjà en 2026 ?", "Non. L'IA de pointe est un assistant très capable (~83 % sur GDPval, ~80 % sur SWE-Bench Pro), mais aucun système ne mène de recherche en IA de bout en bout de façon autonome — le seuil que la plupart jugent déterminant."),
      ("Pourquoi les définitions changent-elles les échéances ?", "Parce qu'un « travailleur à distance interchangeable » et un « chercheur en IA autonome » sont des objectifs très différents. Plus le seuil est haut, plus la date est tardive — d'où des prévisions allant de 2026 à 2047."),
    ],
  },
  "de": {
    "title": "Was ist AGI? Definition, Zeitpläne und aktueller Stand",
    "desc": "AGI ist eine KI, die praktisch jede kognitive Aufgabe eines qualifizierten Menschen erledigen kann. Was der Begriff bedeutet, warum Definitionen die Zeitpläne spalten und wo 2026 steht.",
    "eyebrow": "Definition", "h1": "Was ist AGI? Die Definition hinter dem Streit um die Zeitpläne",
    "capsule": '<span class="verdict">KI, die die kognitive Arbeit eines qualifizierten Menschen leisten kann — und die Definition ist die halbe Miete.</span> AGI (allgemeine künstliche Intelligenz) bedeutet meist eine KI, die praktisch jede kognitive Aufgabe eines menschlichen Fachmanns erledigen kann. Doch Prognostiker legen sehr unterschiedliche Messlatten an — vom «einsetzbaren Remote-Mitarbeiter» bis zum «autonomen KI-Forscher» — und diese Lücke erklärt, warum öffentliche Zeitpläne von 2026 bis 2047 reichen.',
    "secs": [
      ("Die Definitionen, auf die es ankommt", "Zwei Messlatten prägen die Debatte. Der <strong>«einsetzbare Remote-Mitarbeiter»</strong>: eine KI, die jede Wissensarbeit aus der Ferne so gut wie ein kompetenter Mensch erledigt. Und der <strong>«autonome KI-Forscher»</strong>: ein System, das KI-Forschung eigenständig von Anfang bis Ende betreibt. Die zweite Latte liegt weit höher — und sie treibt die aggressivsten Daten wie Aschenbrenners 2027."),
      ("Was AGI NICHT ist", "Kein Chatbot, der gut antwortet, und kein Modell, das eine Prüfung besteht. Die Latte ist <strong>Allgemeinheit</strong>: neue Aufgaben ohne spezielles Nachtraining lösen. Mitte 2026 meistert Spitzen-KI viele Wissensarbeits-Tests (~83 % bei GDPval, ~80 % bei SWE-Bench Pro), hat aber die Linie zur autonomen KI-Forschung noch nicht überschritten."),
    ],
    "faqs": [
      ("Was ist AGI einfach erklärt?", "Eine KI, die im Wesentlichen jede kognitive Aufgabe eines qualifizierten menschlichen Fachmanns erledigen kann, nicht nur eine einzelne Aufgabe. Der Streit dreht sich darum, wie hoch diese Latte liegt."),
      ("Gibt es AGI 2026 schon?", "Nein. Spitzen-KI ist ein sehr fähiger Assistent (~83 % bei GDPval, ~80 % bei SWE-Bench Pro), aber kein System betreibt KI-Forschung eigenständig von Anfang bis Ende — die Latte, die die meisten als entscheidend ansehen."),
      ("Warum ändern Definitionen die Zeitpläne?", "Weil «einsetzbarer Remote-Mitarbeiter» und «autonomer KI-Forscher» sehr unterschiedliche Ziele sind. Je höher die Latte, desto später das Datum — daher Prognosen von 2026 bis 2047."),
    ],
  },
  "pt": {
    "title": "O que é AGI? Definição, prazos e situação atual",
    "desc": "AGI é uma IA capaz de fazer praticamente qualquer tarefa cognitiva de um humano qualificado. O que o termo significa, por que as definições dividem os prazos e onde 2026 se encontra.",
    "eyebrow": "Definição", "h1": "O que é AGI? A definição por trás da briga dos prazos",
    "capsule": '<span class="verdict">IA capaz de fazer o trabalho cognitivo de um humano qualificado — e a definição é metade da briga.</span> AGI (inteligência artificial geral) costuma significar uma IA capaz de realizar praticamente qualquer tarefa cognitiva de um profissional humano. Mas cada previsor usa um patamar diferente — de «trabalhador remoto plugável» a «pesquisador de IA autônomo» — e essa lacuna explica boa parte de por que os prazos públicos vão de 2026 a 2047.',
    "secs": [
      ("As definições que importam", "Dois patamares dominam o debate. O <strong>«trabalhador remoto plugável»</strong>: uma IA que faz qualquer trabalho de conhecimento à distância tão bem quanto um humano competente. E o <strong>«pesquisador de IA autônomo»</strong>: um sistema capaz de conduzir pesquisa de IA do início ao fim sozinho. O segundo patamar é muito mais alto — e é ele que dispara as datas mais agressivas, como o 2027 de Aschenbrenner."),
      ("O que a AGI NÃO é", "Não é um chatbot que responde bem, nem um modelo que passa numa prova. O patamar é a <strong>generalidade</strong>: sair-se bem em tarefas novas sem retreinamento específico. Em meados de 2026, a IA de fronteira supera muitos testes de trabalho de conhecimento (~83 % no GDPval, ~80 % no SWE-Bench Pro), mas ainda não cruzou a linha de pesquisar IA de forma autônoma."),
    ],
    "faqs": [
      ("O que é AGI em palavras simples?", "Uma IA que pode fazer essencialmente qualquer tarefa cognitiva de um profissional humano qualificado, não apenas uma tarefa específica. A discordância é sobre quão alto fica esse patamar."),
      ("A AGI já existe em 2026?", "Não. A IA de fronteira é um assistente muito capaz (~83 % no GDPval, ~80 % no SWE-Bench Pro), mas nenhum sistema faz pesquisa de IA do início ao fim de forma autônoma — o patamar que a maioria considera definidor."),
      ("Por que as definições mudam os prazos?", "Porque «trabalhador remoto plugável» e «pesquisador de IA autônomo» são metas muito diferentes. Quanto mais alto o patamar, mais tardia a data — por isso as previsões vão de 2026 a 2047."),
    ],
  },
  "it": {
    "title": "Cos'è l'AGI? Definizione, tempi e stato attuale",
    "desc": "L'AGI è un'IA capace di svolgere quasi ogni compito cognitivo di un umano qualificato. Cosa significa il termine, perché le definizioni dividono i tempi e dove siamo nel 2026.",
    "eyebrow": "Definizione", "h1": "Cos'è l'AGI? La definizione dietro la battaglia sui tempi",
    "capsule": '<span class="verdict">Un\'IA capace del lavoro cognitivo di un umano qualificato — e la definizione è metà della battaglia.</span> AGI (intelligenza artificiale generale) di solito indica un\'IA in grado di svolgere quasi ogni compito cognitivo di un professionista umano. Ma ogni previsore usa un\'asticella diversa — dal «lavoratore remoto sostituibile» al «ricercatore di IA autonomo» — e questo divario spiega gran parte del perché i tempi pubblici vanno dal 2026 al 2047.',
    "secs": [
      ("Le definizioni che contano", "Due asticelle dominano il dibattito. Il <strong>«lavoratore remoto sostituibile»</strong>: un\'IA che svolge qualsiasi lavoro di conoscenza da remoto bene quanto un umano competente. E il <strong>«ricercatore di IA autonomo»</strong>: un sistema capace di condurre ricerca sull\'IA dall\'inizio alla fine da solo. La seconda asticella è molto più alta — ed è quella che innesca le date più aggressive, come il 2027 di Aschenbrenner."),
      ("Cosa NON è l'AGI", "Non è un chatbot che risponde bene, né un modello che supera un esame. L\'asticella è la <strong>generalità</strong>: riuscire in compiti nuovi senza riaddestramento dedicato. A metà 2026 l\'IA di frontiera supera molti test di lavoro di conoscenza (~83 % su GDPval, ~80 % su SWE-Bench Pro), ma non ha ancora varcato la linea della ricerca autonoma sull\'IA."),
    ],
    "faqs": [
      ("Cos'è l'AGI in parole semplici?", "Un'IA che può svolgere essenzialmente qualsiasi compito cognitivo di un professionista umano qualificato, non solo un compito specifico. Il disaccordo riguarda quanto in alto si pone quest'asticella."),
      ("L'AGI esiste già nel 2026?", "No. L'IA di frontiera è un assistente molto capace (~83 % su GDPval, ~80 % su SWE-Bench Pro), ma nessun sistema conduce ricerca sull'IA dall'inizio alla fine in autonomia — l'asticella che i più ritengono determinante."),
      ("Perché le definizioni cambiano i tempi?", "Perché «lavoratore remoto sostituibile» e «ricercatore di IA autonomo» sono obiettivi molto diversi. Più alta l'asticella, più tardi la data — ecco perché le previsioni vanno dal 2026 al 2047."),
    ],
  },
  "ja": {
    "title": "AGIとは？定義・時期・現在の到達点",
    "desc": "AGIとは、熟練した人間の認知タスクをほぼすべてこなせるAI。用語の意味、なぜ定義が時期予測を分けるのか、そして2026年の到達点を解説。",
    "eyebrow": "定義", "h1": "AGIとは？時期をめぐる論争の核心にある「定義」",
    "capsule": '<span class="verdict">熟練した人間の認知的な仕事をこなせるAI——そして定義こそが論争の半分だ。</span> AGI(汎用人工知能)は通常、人間の専門家ができる認知タスクをほぼすべて実行できるAIを指す。しかし予測者ごとに基準が大きく異なり——「差し替え可能なリモートワーカー」から「自律的なAI研究者」まで——この差が、公開されている時期予測が2026年から2047年まで広がる理由の大半を説明する。',
    "secs": [
      ("重要な二つの定義", "議論を支配する基準は二つある。<strong>「差し替え可能なリモートワーカー」</strong>——有能な人間と同等に、あらゆる知識労働を遠隔でこなせるAI。そして<strong>「自律的なAI研究者」</strong>——AI研究を最初から最後まで独力で遂行できるシステム。後者の基準ははるかに高く、アッシェンブレナーの2027年のような最も強気な予測を生むのはこちらだ。"),
      ("AGIで「ない」もの", "うまく答えるチャットボットでも、試験に合格するモデルでもない。基準は<strong>汎用性</strong>——専用の再学習なしに新しいタスクをこなすことだ。2026年半ば、フロンティアAIは多くの知識労働のテストを突破するが(GDPvalで約83%、SWE-Bench Proで約80%)、AI研究を自律的に行う一線はまだ越えていない。"),
    ],
    "faqs": [
      ("AGIをわかりやすく言うと？", "特定の一つの作業だけでなく、熟練した人間の専門家がこなす認知タスクを本質的に何でもこなせるAI。意見が割れるのは、その基準をどれだけ高く置くかだ。"),
      ("2026年時点でAGIは存在する？", "いいえ。フロンティアAIは非常に有能なアシスタント(GDPval約83%、SWE-Bench Pro約80%)だが、AI研究を最初から最後まで自律的に行うシステムは存在しない——多くが決定的とみなす基準だ。"),
      ("なぜ定義で時期が変わる？", "「差し替え可能なリモートワーカー」と「自律的なAI研究者」は大きく異なる目標だから。基準が高いほど時期は遅くなる——だから予測は2026年から2047年まで広がる。"),
    ],
  },
  "ko": {
    "title": "AGI란? 정의·시점·현재 도달점",
    "desc": "AGI는 숙련된 인간의 인지 작업을 사실상 모두 해낼 수 있는 AI. 용어의 의미, 정의가 시점 예측을 가르는 이유, 그리고 2026년의 도달점을 정리한다.",
    "eyebrow": "정의", "h1": "AGI란? 시점 논쟁의 핵심에 있는 '정의'",
    "capsule": '<span class="verdict">숙련된 인간의 인지적 업무를 해낼 수 있는 AI — 그리고 정의가 논쟁의 절반이다.</span> AGI(범용 인공지능)는 보통 인간 전문가가 할 수 있는 인지 작업을 사실상 모두 수행하는 AI를 뜻한다. 하지만 예측자마다 기준이 크게 달라 — \'대체 가능한 원격 근로자\'부터 \'자율적 AI 연구자\'까지 — 이 격차가 공개된 시점 예측이 2026년부터 2047년까지 벌어지는 이유의 대부분을 설명한다.',
    "secs": [
      ("중요한 두 가지 정의", "논쟁을 지배하는 기준은 둘이다. <strong>\'대체 가능한 원격 근로자\'</strong> — 유능한 인간만큼 모든 지식 노동을 원격으로 해내는 AI. 그리고 <strong>\'자율적 AI 연구자\'</strong> — AI 연구를 처음부터 끝까지 스스로 수행하는 시스템. 두 번째 기준이 훨씬 높으며, 아셴브레너의 2027년 같은 가장 공격적인 시점을 낳는 것이 바로 이것이다."),
      ("AGI가 '아닌' 것", "답을 잘하는 챗봇도, 시험에 합격하는 모델도 아니다. 기준은 <strong>범용성</strong> — 전용 재학습 없이 새로운 작업을 해내는 것이다. 2026년 중반, 프런티어 AI는 많은 지식 노동 시험을 통과하지만(GDPval 약 83%, SWE-Bench Pro 약 80%), AI 연구를 자율적으로 수행하는 선은 아직 넘지 못했다."),
    ],
    "faqs": [
      ("AGI를 쉽게 말하면?", "특정 작업 하나만이 아니라, 숙련된 인간 전문가가 하는 인지 작업을 본질적으로 무엇이든 해내는 AI. 의견이 갈리는 건 그 기준을 얼마나 높게 두느냐다."),
      ("2026년에 AGI가 이미 존재하나?", "아니다. 프런티어 AI는 매우 유능한 조수지만(GDPval 약 83%, SWE-Bench Pro 약 80%), AI 연구를 처음부터 끝까지 자율로 수행하는 시스템은 없다 — 대다수가 결정적이라 보는 기준이다."),
      ("왜 정의가 시점을 바꾸나?", "\'대체 가능한 원격 근로자\'와 \'자율적 AI 연구자\'는 매우 다른 목표이기 때문이다. 기준이 높을수록 시점은 늦어진다 — 그래서 예측이 2026년부터 2047년까지 벌어진다."),
    ],
  },
}

# ---- how-close-is-agi ----
PAGES["how-close-is-agi"] = {
  "zh": True,
  "es": {
    "title": "¿Cuánto falta para la AGI? Chequeo de capacidades (2026)",
    "desc": "Más cerca de lo que dicen los escépticos, más lejos de lo que afirman los optimistas. A mediados de 2026 la IA de frontera supera muchas pruebas de trabajo de conocimiento (~83 % GDPval, ~80 % SWE-Bench Pro), pero no la línea definitoria.",
    "eyebrow": "Análisis", "h1": "¿Cuánto falta para la AGI? Un chequeo de capacidades",
    "capsule": '<span class="verdict">Más cerca de lo que dicen los escépticos, más lejos de lo que afirman los optimistas.</span> A mediados de 2026, la IA de frontera supera muchas pruebas de trabajo de conocimiento — ~83 % en GDPval, ~80 % en SWE-Bench Pro, agentes en producción — pero no ha cruzado la línea que la definiría: hacer investigación de IA de principio a fin de forma autónoma. En capacidad estamos muy dentro del «asistente muy capaz», aún no del «investigador enchufable».',
    "secs": [
      ("Lo que ya está aquí", "Codificación agéntica cercana al nivel humano en muchas tareas (~80 % en SWE-Bench Pro), trabajo de conocimiento fuerte (~83 % en GDPval) y agentes que ejecutan flujos de varios pasos en producción. La escala de cómputo sigue subiendo ~0,5 órdenes de magnitud al año. La capacidad bruta ya no es el cuello de botella."),
      ("La pieza que falta", "Ningún sistema hace <strong>investigación de IA de forma autónoma de principio a fin</strong> — el listón que la mayoría considera definitorio de la AGI. Persisten fallos de fiabilidad, memoria a largo plazo y autonomía sostenida. Por eso la predicción de AGI para 2027 se califica como <strong class=\"v-open\">Abierta</strong>, y se resuelve antes del 1 de enero de 2028."),
    ],
    "faqs": [
      ("¿Estamos cerca de la AGI en 2026?", "En capacidad, sí y no: la IA de frontera resuelve muchas pruebas de trabajo de conocimiento (~83 % GDPval, ~80 % SWE-Bench Pro) pero aún no hace investigación de IA de forma autónoma, la línea definitoria."),
      ("¿Qué le falta a la IA actual para ser AGI?", "Fiabilidad, memoria a largo plazo y autonomía sostenida para ejecutar investigación compleja de principio a fin sin supervisión humana continua."),
      ("¿Cuándo cruzaremos esa línea?", "Los pronósticos públicos van de 2026 (Musk) y 2027 (Aschenbrenner) a ~2030 (Hassabis), 2033 (Metaculus) y 2047 (encuestas académicas). El 2027 es el plazo concreto más cercano."),
    ],
  },
  "fr": {
    "title": "Sommes-nous proches de l'AGI ? Bilan des capacités (2026)",
    "desc": "Plus proche que ne le disent les sceptiques, plus loin que ne l'affirment les optimistes. Mi-2026, l'IA de pointe franchit de nombreux tests de travail intellectuel (~83 % GDPval, ~80 % SWE-Bench Pro), mais pas la ligne décisive.",
    "eyebrow": "Analyse", "h1": "Sommes-nous proches de l'AGI ? Un bilan des capacités",
    "capsule": '<span class="verdict">Plus proche que ne le disent les sceptiques, plus loin que ne l\'affirment les optimistes.</span> Mi-2026, l\'IA de pointe franchit de nombreux tests de travail intellectuel — ~83 % sur GDPval, ~80 % sur SWE-Bench Pro, des agents en production — mais n\'a pas franchi la ligne décisive : mener une recherche en IA de bout en bout de façon autonome. En capacité, nous sommes bien dans « l\'assistant très compétent », pas encore le « chercheur interchangeable ».',
    "secs": [
      ("Ce qui est déjà là", "Codage agentique proche du niveau humain sur de nombreuses tâches (~80 % sur SWE-Bench Pro), travail intellectuel solide (~83 % sur GDPval) et des agents qui exécutent des flux multi-étapes en production. Le calcul continue de croître d'environ 0,5 ordre de grandeur par an. La capacité brute n'est plus le goulot d'étranglement."),
      ("La pièce manquante", "Aucun système ne mène de <strong>recherche en IA de bout en bout de façon autonome</strong> — le seuil que la plupart jugent déterminant pour l'AGI. Des défauts de fiabilité, de mémoire à long terme et d'autonomie soutenue persistent. C'est pourquoi la prédiction d'AGI pour 2027 est jugée <strong class=\"v-open\">Ouverte</strong>, et se résout avant le 1er janvier 2028."),
    ],
    "faqs": [
      ("Sommes-nous proches de l'AGI en 2026 ?", "En capacité, oui et non : l'IA de pointe réussit de nombreux tests de travail intellectuel (~83 % GDPval, ~80 % SWE-Bench Pro) mais ne mène pas encore de recherche en IA de façon autonome, la ligne décisive."),
      ("Que manque-t-il à l'IA actuelle pour être une AGI ?", "La fiabilité, la mémoire à long terme et l'autonomie soutenue pour mener une recherche complexe de bout en bout sans supervision humaine continue."),
      ("Quand franchirons-nous cette ligne ?", "Les prévisions publiques vont de 2026 (Musk) et 2027 (Aschenbrenner) à ~2030 (Hassabis), 2033 (Metaculus) et 2047 (enquêtes académiques). 2027 est l'échéance concrète la plus proche."),
    ],
  },
  "de": {
    "title": "Wie nah ist AGI? Ein Fähigkeits-Check (2026)",
    "desc": "Näher, als Skeptiker sagen, weiter, als Optimisten behaupten. Mitte 2026 meistert Spitzen-KI viele Wissensarbeits-Tests (~83 % GDPval, ~80 % SWE-Bench Pro), aber nicht die entscheidende Linie.",
    "eyebrow": "Analyse", "h1": "Wie nah ist AGI? Ein Fähigkeits-Check",
    "capsule": '<span class="verdict">Näher, als Skeptiker sagen, weiter, als Optimisten behaupten.</span> Mitte 2026 meistert Spitzen-KI viele Wissensarbeits-Tests — ~83 % bei GDPval, ~80 % bei SWE-Bench Pro, Agenten im Produktivbetrieb — hat aber die entscheidende Linie nicht überschritten: KI-Forschung eigenständig von Anfang bis Ende zu betreiben. Bei der Fähigkeit sind wir tief im «sehr fähigen Assistenten», noch nicht im «einsetzbaren Forscher».',
    "secs": [
      ("Was bereits da ist", "Agentisches Programmieren nahe Menschenniveau bei vielen Aufgaben (~80 % bei SWE-Bench Pro), starke Wissensarbeit (~83 % bei GDPval) und Agenten, die mehrstufige Abläufe im Produktivbetrieb ausführen. Die Rechenleistung wächst weiter um ~0,5 Größenordnungen pro Jahr. Die reine Fähigkeit ist nicht mehr der Engpass."),
      ("Das fehlende Teil", "Kein System betreibt <strong>KI-Forschung eigenständig von Anfang bis Ende</strong> — die Latte, die die meisten als AGI-entscheidend ansehen. Mängel bei Zuverlässigkeit, Langzeitgedächtnis und dauerhafter Autonomie bleiben. Deshalb gilt die AGI-Prognose für 2027 als <strong class=\"v-open\">Offen</strong> und wird vor dem 1. Januar 2028 entschieden."),
    ],
    "faqs": [
      ("Sind wir 2026 nah an AGI?", "Bei der Fähigkeit ja und nein: Spitzen-KI besteht viele Wissensarbeits-Tests (~83 % GDPval, ~80 % SWE-Bench Pro), betreibt aber noch keine eigenständige KI-Forschung, die entscheidende Linie."),
      ("Was fehlt heutiger KI für AGI?", "Zuverlässigkeit, Langzeitgedächtnis und dauerhafte Autonomie, um komplexe Forschung ohne ständige menschliche Aufsicht von Anfang bis Ende durchzuführen."),
      ("Wann überschreiten wir diese Linie?", "Öffentliche Prognosen reichen von 2026 (Musk) und 2027 (Aschenbrenner) bis ~2030 (Hassabis), 2033 (Metaculus) und 2047 (akademische Umfragen). 2027 ist die nächste konkrete Frist."),
    ],
  },
  "pt": {
    "title": "Quão perto estamos da AGI? Um check de capacidades (2026)",
    "desc": "Mais perto do que dizem os céticos, mais longe do que afirmam os otimistas. Em meados de 2026, a IA de fronteira supera muitos testes de trabalho de conhecimento (~83 % GDPval, ~80 % SWE-Bench Pro), mas não a linha definidora.",
    "eyebrow": "Análise", "h1": "Quão perto estamos da AGI? Um check de capacidades",
    "capsule": '<span class="verdict">Mais perto do que dizem os céticos, mais longe do que afirmam os otimistas.</span> Em meados de 2026, a IA de fronteira supera muitos testes de trabalho de conhecimento — ~83 % no GDPval, ~80 % no SWE-Bench Pro, agentes em produção — mas não cruzou a linha que a definiria: fazer pesquisa de IA do início ao fim de forma autônoma. Em capacidade, estamos bem dentro do «assistente muito capaz», ainda não do «pesquisador plugável».',
    "secs": [
      ("O que já chegou", "Codificação agêntica perto do nível humano em muitas tarefas (~80 % no SWE-Bench Pro), trabalho de conhecimento forte (~83 % no GDPval) e agentes executando fluxos de várias etapas em produção. A escala de computação segue subindo ~0,5 ordem de magnitude por ano. A capacidade bruta já não é o gargalo."),
      ("A peça que falta", "Nenhum sistema faz <strong>pesquisa de IA do início ao fim de forma autônoma</strong> — o patamar que a maioria considera definidor da AGI. Persistem falhas de confiabilidade, memória de longo prazo e autonomia sustentada. Por isso a previsão de AGI para 2027 é classificada como <strong class=\"v-open\">Aberta</strong>, e se resolve antes de 1º de janeiro de 2028."),
    ],
    "faqs": [
      ("Estamos perto da AGI em 2026?", "Em capacidade, sim e não: a IA de fronteira passa em muitos testes de trabalho de conhecimento (~83 % GDPval, ~80 % SWE-Bench Pro) mas ainda não faz pesquisa de IA de forma autônoma, a linha definidora."),
      ("O que falta à IA atual para ser AGI?", "Confiabilidade, memória de longo prazo e autonomia sustentada para conduzir pesquisa complexa do início ao fim sem supervisão humana contínua."),
      ("Quando cruzaremos essa linha?", "As previsões públicas vão de 2026 (Musk) e 2027 (Aschenbrenner) a ~2030 (Hassabis), 2033 (Metaculus) e 2047 (pesquisas acadêmicas). 2027 é o prazo concreto mais próximo."),
    ],
  },
  "it": {
    "title": "Quanto siamo vicini all'AGI? Un check delle capacità (2026)",
    "desc": "Più vicini di quanto dicano gli scettici, più lontani di quanto affermino gli ottimisti. A metà 2026 l'IA di frontiera supera molti test di lavoro di conoscenza (~83 % GDPval, ~80 % SWE-Bench Pro), ma non la linea decisiva.",
    "eyebrow": "Analisi", "h1": "Quanto siamo vicini all'AGI? Un check delle capacità",
    "capsule": '<span class="verdict">Più vicini di quanto dicano gli scettici, più lontani di quanto affermino gli ottimisti.</span> A metà 2026, l\'IA di frontiera supera molti test di lavoro di conoscenza — ~83 % su GDPval, ~80 % su SWE-Bench Pro, agenti in produzione — ma non ha varcato la linea che la definirebbe: condurre ricerca sull\'IA dall\'inizio alla fine in autonomia. Sulla capacità siamo ben dentro «l\'assistente molto capace», non ancora il «ricercatore sostituibile».',
    "secs": [
      ("Ciò che c'è già", "Coding agentico vicino al livello umano in molti compiti (~80 % su SWE-Bench Pro), lavoro di conoscenza solido (~83 % su GDPval) e agenti che eseguono flussi a più passi in produzione. Il calcolo continua a crescere di ~0,5 ordini di grandezza l'anno. La capacità grezza non è più il collo di bottiglia."),
      ("Il pezzo mancante", "Nessun sistema conduce <strong>ricerca sull'IA dall'inizio alla fine in autonomia</strong> — l'asticella che i più ritengono determinante per l'AGI. Restano problemi di affidabilità, memoria a lungo termine e autonomia prolungata. Per questo la previsione di AGI per il 2027 è giudicata <strong class=\"v-open\">Aperta</strong>, e si risolve entro il 1° gennaio 2028."),
    ],
    "faqs": [
      ("Siamo vicini all'AGI nel 2026?", "Sulla capacità sì e no: l'IA di frontiera supera molti test di lavoro di conoscenza (~83 % GDPval, ~80 % SWE-Bench Pro) ma non conduce ancora ricerca sull'IA in autonomia, la linea decisiva."),
      ("Cosa manca all'IA attuale per essere AGI?", "Affidabilità, memoria a lungo termine e autonomia prolungata per condurre ricerca complessa dall'inizio alla fine senza supervisione umana continua."),
      ("Quando varcheremo quella linea?", "Le previsioni pubbliche vanno dal 2026 (Musk) e 2027 (Aschenbrenner) a ~2030 (Hassabis), 2033 (Metaculus) e 2047 (sondaggi accademici). Il 2027 è la scadenza concreta più vicina."),
    ],
  },
  "ja": {
    "title": "AGIまであとどれくらい？能力チェック(2026)",
    "desc": "懐疑派が言うより近く、楽観派が言うより遠い。2026年半ば、フロンティアAIは多くの知識労働テストを突破するが(GDPval約83%、SWE-Bench Pro約80%)、決定的な一線はまだだ。",
    "eyebrow": "分析", "h1": "AGIまであとどれくらい？能力チェック",
    "capsule": '<span class="verdict">懐疑派が言うより近く、楽観派が言うより遠い。</span> 2026年半ば、フロンティアAIは多くの知識労働テストを突破する——GDPvalで約83%、SWE-Bench Proで約80%、エージェントは本番稼働——が、それを定義づける一線はまだ越えていない：AI研究を最初から最後まで自律的に行うことだ。能力面では「非常に有能なアシスタント」の域に深く入っているが、「差し替え可能な研究者」にはまだ届かない。',
    "secs": [
      ("すでに実現していること", "多くのタスクで人間に近いエージェント型コーディング(SWE-Bench Pro約80%)、強力な知識労働(GDPval約83%)、そして複数ステップのワークフローを本番で実行するエージェント。計算資源は年に約0.5桁で増え続けている。素の能力はもはやボトルネックではない。"),
      ("欠けているピース", "どのシステムも<strong>AI研究を最初から最後まで自律的に</strong>行えていない——多くがAGIの決め手とみなす基準だ。信頼性、長期記憶、持続的な自律性の欠陥が残る。だからこそ2027年のAGI予測は<strong class=\"v-open\">未決(Open)</strong>と判定され、2028年1月1日までに決着する。"),
    ],
    "faqs": [
      ("2026年時点でAGIは近い？", "能力面ではイエスでもありノーでもある：フロンティアAIは多くの知識労働テストを突破する(GDPval約83%、SWE-Bench Pro約80%)が、決定的な一線であるAI研究の自律実行はまだできない。"),
      ("今のAIがAGIになるには何が足りない？", "人間の継続的な監督なしに、複雑な研究を最初から最後まで遂行するための信頼性・長期記憶・持続的な自律性。"),
      ("その一線はいつ越える？", "公開予測は2026年(マスク)・2027年(アッシェンブレナー)から、約2030年(ハサビス)、2033年(Metaculus)、2047年(学術調査)まで幅がある。2027年が最も近い具体的な期限だ。"),
    ],
  },
  "ko": {
    "title": "AGI까지 얼마나 남았나? 능력 점검(2026)",
    "desc": "회의론자들의 말보다 가깝고, 낙관론자들의 주장보다 멀다. 2026년 중반, 프런티어 AI는 많은 지식 노동 테스트를 통과하지만(GDPval 약 83%, SWE-Bench Pro 약 80%) 결정적 선은 아직이다.",
    "eyebrow": "분석", "h1": "AGI까지 얼마나 남았나? 능력 점검",
    "capsule": '<span class="verdict">회의론자들의 말보다 가깝고, 낙관론자들의 주장보다 멀다.</span> 2026년 중반, 프런티어 AI는 많은 지식 노동 테스트를 통과한다 — GDPval 약 83%, SWE-Bench Pro 약 80%, 프로덕션의 에이전트 — 그러나 그것을 정의할 선은 넘지 못했다: AI 연구를 처음부터 끝까지 자율적으로 수행하는 것. 능력 면에서 우리는 \'매우 유능한 조수\' 안에 깊이 있지만, 아직 \'대체 가능한 연구자\'는 아니다.',
    "secs": [
      ("이미 도달한 것", "많은 작업에서 인간에 가까운 에이전트형 코딩(SWE-Bench Pro 약 80%), 강력한 지식 노동(GDPval 약 83%), 그리고 다단계 워크플로를 프로덕션에서 실행하는 에이전트. 연산 규모는 매년 약 0.5자릿수씩 계속 증가한다. 순수 능력은 더 이상 병목이 아니다."),
      ("빠진 조각", "어떤 시스템도 <strong>AI 연구를 처음부터 끝까지 자율적으로</strong> 수행하지 못한다 — 대다수가 AGI의 결정적 기준으로 보는 선이다. 신뢰성, 장기 기억, 지속적 자율성의 결함이 남아 있다. 그래서 2027년 AGI 예측은 <strong class=\"v-open\">미결(Open)</strong>로 판정되며, 2028년 1월 1일까지 결론난다."),
    ],
    "faqs": [
      ("2026년에 AGI가 가까운가?", "능력 면에서 예이자 아니다: 프런티어 AI는 많은 지식 노동 테스트를 통과하지만(GDPval 약 83%, SWE-Bench Pro 약 80%) 결정적 선인 AI 연구의 자율 수행은 아직 못 한다."),
      ("지금 AI가 AGI가 되려면 무엇이 부족한가?", "인간의 지속적 감독 없이 복잡한 연구를 처음부터 끝까지 수행할 신뢰성·장기 기억·지속적 자율성."),
      ("그 선은 언제 넘나?", "공개 예측은 2026년(머스크)·2027년(아셴브레너)부터 약 2030년(하사비스), 2033년(Metaculus), 2047년(학술 조사)까지 걸쳐 있다. 2027년이 가장 가까운 구체적 기한이다."),
    ],
  },
}

# 三行性能提示必须留在模板里:它们是 2026-07 之后手工补到已生成页上的,
# 而模板没有 → 2026-08-16 重跑生成器时被整批吃掉了。生成器是这些页的唯一真相,
# 模板缺什么,重跑就会删什么。
FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="dns-prefetch" href="https://www.googletagmanager.com">'
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">')
STYLE = """<style>
  :root{--bg:#0a0a0b;--bg2:#111114;--bg3:#18181d;--border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);--text:#e8e8ec;--muted:#8888a0;--accent:#7c6af5;--accent2:#4fc3a1;--warn:#e8a040;--danger:#e05555;--font:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--mono:'JetBrains Mono',monospace;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:16px;line-height:1.75;}
  a{color:var(--accent);text-decoration:none;}a:hover{opacity:.8;}
  header{border-bottom:1px solid var(--border);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;background:rgba(10,10,11,.92);backdrop-filter:blur(12px);z-index:100;}
  .logo{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;color:var(--text);}
  .logo-dot{width:8px;height:8px;background:var(--accent2);border-radius:50%;}
  .back-link{font-size:13px;color:var(--muted);}.back-link:hover{color:var(--text);opacity:1;}
  article{max-width:720px;margin:0 auto;padding:2.5rem 1.5rem 4rem;}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.75rem;}
  h1{font-size:clamp(1.7rem,4vw,2.4rem);font-weight:700;letter-spacing:-.02em;line-height:1.18;margin-bottom:1.25rem;}
  .capsule{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--accent2);border-radius:0 10px 10px 0;padding:1.15rem 1.4rem;font-size:16px;margin-bottom:1.75rem;}
  .capsule .verdict{font-weight:700;}
  .v-ok{color:var(--accent2);}.v-wrong{color:var(--danger);}.v-open{color:var(--accent);}.v-pending{color:var(--muted);}
  h2{font-size:1.25rem;font-weight:600;margin:2.25rem 0 .9rem;letter-spacing:-.01em;}
  p{margin-bottom:1rem;}
  strong{color:#fff;}
  .faq-q{font-weight:600;margin:1.3rem 0 .4rem;}
  .related{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid var(--border);}
  .related h2{margin-top:0;}.related a{display:block;padding:6px 0;font-size:14px;}
  .updated{font-size:12px;color:var(--muted);margin-bottom:1.5rem;}
  .cta{margin-top:2rem;background:linear-gradient(135deg,rgba(124,106,245,.08),rgba(79,195,161,.06));border:1px solid rgba(124,106,245,.2);border-radius:14px;padding:1.5rem;text-align:center;}
  .cta a{display:inline-block;background:var(--accent);color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:500;margin-top:.6rem;}
  footer{border-top:1px solid var(--border);padding:24px 0;font-size:12px;color:var(--muted);text-align:center;}
</style>"""

def hreflang_block(slug, has_zh, langs_present):
    out = [f'<link rel="alternate" hreflang="en" href="https://agiscorecard.com/{slug}">']
    if has_zh:
        out.append(f'<link rel="alternate" hreflang="zh-Hans" href="https://agiscorecard.com/zh/{slug}">')
    for l in langs_present:
        out.append(f'<link rel="alternate" hreflang="{l}" href="https://agiscorecard.com/{l}/{slug}">')
    out.append(f'<link rel="alternate" hreflang="x-default" href="https://agiscorecard.com/{slug}">')
    return "\n".join(out)

def langbar(slug, lang, has_zh, langs_present):
    parts = []
    def item(href, label, active):
        if active:
            return f'<span style="color:var(--text);font-weight:600;">{label}</span>'
        return f'<a href="{href}" style="color:var(--muted);">{label}</a>'
    parts.append(item(f"/{slug}", "EN", False))
    if has_zh:
        parts.append(item(f"/zh/{slug}", "中文", False))
    for l in langs_present:
        parts.append(item(f"/{l}/{slug}", LABEL[l], l == lang))
    sep = ' <span style="color:var(--border2);">·</span> '
    return ('<nav class="langbar" aria-label="Language" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:12px;margin:-0.5rem 0 1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--border);">'
            + sep.join(parts) + '</nav>')

def build_page(slug, lang, data, has_zh, langs_present):
    u = UI[lang]
    d = data[lang]
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang,
              "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in d["faqs"]]}
    art_ld = {"@context": "https://schema.org", "@type": "Article", "headline": d["h1"], "datePublished": DATE,
              "dateModified": DATE, "inLanguage": lang, "author": {"@type": "Organization", "name": "The AGI Scorecard"},
              "publisher": {"@type": "Organization", "name": "The AGI Scorecard", "url": "https://agiscorecard.com/"},
              "description": d["desc"]}
    secs_html = "".join('<h2>%s</h2>\n<p>%s</p>\n' % (h, p) for h, p in d["secs"])
    faq_html = "".join('<div class="faq-q">%s</div><p>%s</p>' % (q, a) for q, a in d["faqs"])
    when_label = {"es": "¿Cuándo llegará la AGI? →", "fr": "Quand arrivera l'AGI ? →", "de": "Wann kommt AGI? →", "pt": "Quando chegará a AGI? →", "it": "Quando arriverà l'AGI? →", "ja": "AGIはいつ来る？ →", "ko": "AGI는 언제 오나? →"}[lang]
    scorecard_label = {"es": "Scorecard completo de dos años →", "fr": "Le scorecard complet sur deux ans →", "de": "Vollständiges Zwei-Jahres-Scorecard →", "pt": "Scorecard completo de dois anos →", "it": "Scorecard completo di due anni →", "ja": "2年間の全スコアカード →", "ko": "2년 전체 스코어카드 →"}[lang]
    related = ('<a href="/%s/when-will-agi-arrive">%s</a><a href="/agi-test">%s</a><a href="/two-year-scorecard.html">%s</a>'
               % (lang, when_label, u["test"], scorecard_label))
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA}');</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0b'/%3E%3Ccircle cx='16' cy='16' r='6' fill='%234fc3a1'/%3E%3C/svg%3E">
<title>{d["title"]}</title>
<meta name="description" content="{d["desc"]}">
<link rel="canonical" href="https://agiscorecard.com/{lang}/{slug}">
{hreflang_block(slug, has_zh, langs_present)}
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="{d["h1"]}">
<meta property="og:description" content="{d["desc"]}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://agiscorecard.com/{lang}/{slug}">
<meta property="og:image" content="https://agiscorecard.com/scorecard-summary.png">
<meta property="og:locale" content="{LOCALE[lang]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://agiscorecard.com/scorecard-summary.png">
<script type="application/ld+json">{json.dumps(art_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>
{FONT}
{STYLE}
</head>
<body>
<header>
  <a href="/" class="logo"><span class="logo-dot"></span>AGI Scorecard</a>
  <a href="/{slug}" class="back-link">EN ↗</a>
</header>
<article>
  <div class="eyebrow">{d["eyebrow"]}</div>
  <h1>{d["h1"]}</h1>
  <div class="updated">{u["updated"]}: {DATE}</div>
  {langbar(slug, lang, has_zh, langs_present)}
  <div class="capsule">{d["capsule"]}</div>
{secs_html}  <h2>{u["faq"]}</h2>
  {faq_html}
  <div class="related">
    <h2>{u["related"]}</h2>
    {related}
  </div>
  <div class="cta" style="background:var(--bg2);border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">{u["sub_h"]}</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">{u["sub_p"]}</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&amp;utm_medium=intl_deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{{location:'intl_deep_page'}});">{u["sub_b"]}</a>
  </div>
  <div class="cta">
    <p style="margin:0;font-weight:600;">{ {"es":"El scorecard en vivo se actualiza a medida que salen modelos y cambian los veredictos.","fr":"Le scorecard en direct se met à jour au fil des modèles et des verdicts.","de":"Das Live-Scorecard aktualisiert sich mit neuen Modellen und Verdicts.","pt":"O scorecard ao vivo se atualiza conforme saem modelos e mudam os veredictos.","it":"Lo scorecard dal vivo si aggiorna con nuovi modelli e verdetti.","ja":"ライブ・スコアカードはモデルのリリースと判定の変化に合わせて更新されます。","ko":"실시간 스코어카드는 모델 출시와 판정 변화에 따라 업데이트됩니다."}[lang]}</p>
    <a href="/">{u["back"]}</a>
  </div>
</article>
<footer>AGI Scorecard · {u["foot"]} <a href="https://situational-awareness.ai" style="color:var(--muted);">Situational Awareness</a> · {u["notaff"]}</footer>
</body>
</html>"""

# ---- situational-awareness-summary（2026-08-16 引用放大队列首项：该页独占全站 42% 的
# AI 引用却零翻译。以下为英文原页的忠实翻译，判定、数字、日期一律照搬，不新增事实。）----
PAGES["situational-awareness-summary"] = {
  "zh": True,   # zh 版已由 gen_zh_citation_pages.py 生成 → 纳入 hreflang/langbar
  "en_title": "Situational Awareness, summarized — and graded",
  "es": {
    "title": "Situational Awareness: resumen y calificación",
    "desc": "El ensayo de Aschenbrenner defiende la AGI para 2027. Dos años después: qué se ha cumplido, qué falló y qué sigue abierto, con veredictos fechados.",
    "eyebrow": "Resumen calificado", "h1": "Situational Awareness, resumido — y calificado",
    "capsule": '<span class="verdict">La tesis de que la AGI está cerca — respaldada en su día por un fondo de 45.000 M$ que quebró en julio de 2026.</span> <em>Situational Awareness</em> (junio de 2024) sostiene que la AGI es plausible para <strong>2027</strong> y la superinteligencia a principios de los 2030, impulsadas por el escalado de cómputo, las mejoras algorítmicas y el «unhobbling». Dos años después, sus predicciones de tendencia se sostienen en gran medida; su apuesta por la desaparición del código abierto es <strong>errónea</strong>; la AGI en 2027 sigue <strong>abierta</strong>.',
    "secs": [
      ("Qué argumenta el ensayo", "El ensayo de 165 páginas de Leopold Aschenbrenner se construye extrapolando tendencias en órdenes de magnitud (OOM). La cadena de razonamiento: el cómputo sigue escalando, los algoritmos siguen mejorando, los modelos se «desatan» (herramientas, agentes, razonamiento) — y todo ello se combina para llegar hacia 2027 a una IA capaz de hacer el trabajo de un investigador de IA. Eso desencadena una explosión de inteligencia (2027–29) y superinteligencia en los 2030, con la seguridad nacional tomando el control mediante un «Proyecto» gubernamental."),
      ("Las predicciones clave", "<ul><li><strong>AGI para 2027</strong> — IA al nivel de un investigador de IA automatizado</li><li><strong>Explosión de inteligencia 2027–29</strong> — la IA automatiza la investigación en IA y comprime una década en un año</li><li><strong>Superinteligencia en los 2030</strong></li><li><strong>Escalado de cómputo ~0,5 OOM/año</strong> y <strong>capex de billones de dólares</strong></li><li><strong>El código abierto se desvanece</strong>; los algoritmos propietarios forman un foso duradero de EE. UU.</li><li><strong>Un proyecto AGI del gobierno de EE. UU.</strong> («El Proyecto») para 2027/28</li></ul>"),
      ("El balance", "Las curvas de entrada por las que apostó Aschenbrenner — cómputo, capex, capacidad bruta — se han mantenido o han superado lo esperado. Su mayor fallo está en la difusión: el código abierto no se desvaneció. La afirmación que lo define, AGI para 2027, se resuelve en enero de 2028."),
    ],
    "faqs": [
      ("¿De qué trata Situational Awareness?", "Es el ensayo de junio de 2024 de Leopold Aschenbrenner que sostiene que la AGI es plausible para 2027, seguida de una explosión de inteligencia y superinteligencia en los 2030, impulsadas por el escalado de cómputo, las mejoras algorítmicas y el «unhobbling»."),
      ("¿Qué predijo Situational Awareness?", "AGI para 2027, una explosión de inteligencia en 2027–29, superinteligencia en los 2030, escalado continuado del cómputo, capex de billones de dólares, la desaparición del código abierto y un proyecto AGI del gobierno de EE. UU."),
      ("¿Es acertado Situational Awareness?", "En parte. Sus predicciones de cómputo, capex y capacidad se han mantenido en gran medida; su predicción sobre el código abierto es errónea; y su afirmación definitoria, AGI en 2027, sigue abierta y se resuelve en enero de 2028."),
    ],
  },
  "fr": {
    "title": "Situational Awareness : résumé et évaluation",
    "desc": "L\'essai d\'Aschenbrenner plaide pour une AGI en 2027. Deux ans après : ce qui tient, ce qui a échoué, ce qui reste ouvert, avec des verdicts datés.",
    "eyebrow": "Résumé évalué", "h1": "Situational Awareness, résumé — et évalué",
    "capsule": '<span class="verdict">La thèse selon laquelle l\'AGI est proche — jadis adossée à un fonds de 45 Md$ qui a explosé en juillet 2026.</span> <em>Situational Awareness</em> (juin 2024) soutient que l\'AGI est plausible d\'ici <strong>2027</strong> et la superintelligence au début des années 2030, portées par la montée en puissance du calcul, les gains algorithmiques et le « unhobbling ». Deux ans plus tard, ses prédictions de tendance tiennent largement ; son pari sur la disparition de l\'open source est <strong>faux</strong> ; l\'AGI en 2027 reste <strong>ouverte</strong>.',
    "secs": [
      ("Ce que soutient l\'essai", "L\'essai de 165 pages de Leopold Aschenbrenner repose sur l\'extrapolation de tendances en ordres de grandeur (OOM). La chaîne de raisonnement : le calcul continue de croître, les algorithmes continuent de s\'améliorer, les modèles sont « désentravés » (outils, agents, raisonnement) — et la combinaison mène vers 2027 à une IA capable de faire le travail d\'un chercheur en IA. Cela déclenche une explosion d\'intelligence (2027–29) et la superintelligence dans les années 2030, la sécurité nationale prenant inévitablement le relais via un « Projet » gouvernemental."),
      ("Les prédictions clés", "<ul><li><strong>AGI d\'ici 2027</strong> — une IA au niveau d\'un chercheur en IA automatisé</li><li><strong>Explosion d\'intelligence 2027–29</strong> — l\'IA automatise la recherche en IA et comprime une décennie en un an</li><li><strong>Superintelligence dans les années 2030</strong></li><li><strong>Croissance du calcul ~0,5 OOM/an</strong> et <strong>capex de mille milliards de dollars</strong></li><li><strong>L\'open source s\'efface</strong> ; les algorithmes propriétaires forment un fossé durable pour les États-Unis</li><li><strong>Un projet AGI du gouvernement américain</strong> (« Le Projet ») d\'ici 2027/28</li></ul>"),
      ("Le bilan", "Les courbes d\'entrée sur lesquelles Aschenbrenner a parié — calcul, capex, capacité brute — ont largement tenu, voire dépassé les attentes. Son plus grand échec porte sur la diffusion : l\'open source ne s\'est pas effacé. L\'affirmation qui définit l\'essai, l\'AGI en 2027, sera tranchée en janvier 2028."),
    ],
    "faqs": [
      ("De quoi parle Situational Awareness ?", "C\'est l\'essai de juin 2024 de Leopold Aschenbrenner, qui soutient que l\'AGI est plausible d\'ici 2027, suivie d\'une explosion d\'intelligence et de la superintelligence dans les années 2030, portées par la montée du calcul, les gains algorithmiques et le « unhobbling »."),
      ("Qu\'a prédit Situational Awareness ?", "L\'AGI d\'ici 2027, une explosion d\'intelligence en 2027–29, la superintelligence dans les années 2030, la poursuite de la croissance du calcul, un capex de mille milliards de dollars, l\'effacement de l\'open source et un projet AGI du gouvernement américain."),
      ("Situational Awareness est-il exact ?", "En partie. Ses prédictions sur le calcul, le capex et les capacités ont largement tenu ; sa prédiction sur l\'open source est fausse ; et son affirmation déterminante, l\'AGI en 2027, reste ouverte et sera tranchée en janvier 2028."),
    ],
  },
  "de": {
    "title": "Situational Awareness: Zusammenfassung und Bewertung",
    "desc": "Aschenbrenners Essay argumentiert für AGI bis 2027. Zwei Jahre später: was hält, was falsch war und was offen bleibt — mit datierten Urteilen.",
    "eyebrow": "Bewertete Zusammenfassung", "h1": "Situational Awareness, zusammengefasst — und bewertet",
    "capsule": '<span class="verdict">Die These, dass AGI nah ist — einst gestützt von einem 45-Mrd.-$-Fonds, der im Juli 2026 platzte.</span> <em>Situational Awareness</em> (Juni 2024) argumentiert, AGI sei bis <strong>2027</strong> plausibel und Superintelligenz Anfang der 2030er — getrieben von Rechenleistungswachstum, algorithmischen Fortschritten und „Unhobbling“. Zwei Jahre später halten die Trendprognosen weitgehend; die Wette auf das Verschwinden von Open Source ist <strong>falsch</strong>; AGI 2027 bleibt <strong>offen</strong>.',
    "secs": [
      ("Was der Essay behauptet", "Leopold Aschenbrenners 165-seitiger Essay baut auf der Extrapolation von Größenordnungs-Trends (OOM) auf. Die Argumentationskette: Rechenleistung wächst weiter, Algorithmen verbessern sich weiter, Modelle werden „entfesselt“ (Werkzeuge, Agenten, Reasoning) — und zusammen führt das um 2027 zu einer KI, die die Arbeit eines KI-Forschers erledigen kann. Das löst eine Intelligenzexplosion (2027–29) und Superintelligenz in den 2030ern aus, wobei die nationale Sicherheit unweigerlich über ein staatliches „Projekt“ übernimmt."),
      ("Die zentralen Prognosen", "<ul><li><strong>AGI bis 2027</strong> — KI auf dem Niveau eines automatisierten KI-Forschers</li><li><strong>Intelligenzexplosion 2027–29</strong> — KI automatisiert KI-Forschung und presst ein Jahrzehnt in ein Jahr</li><li><strong>Superintelligenz in den 2030ern</strong></li><li><strong>Rechenleistungswachstum ~0,5 OOM/Jahr</strong> und <strong>Billionen-Dollar-Capex</strong></li><li><strong>Open Source verschwindet</strong>; proprietäre Algorithmen bilden einen dauerhaften US-Burggraben</li><li><strong>Ein AGI-Projekt der US-Regierung</strong> („The Project“) bis 2027/28</li></ul>"),
      ("Das Fazit", "Die Eingangskurven, auf die Aschenbrenner setzte — Rechenleistung, Capex, rohe Fähigkeit — haben weitgehend gehalten oder die Erwartungen übertroffen. Sein größter Fehlschlag betrifft die Verbreitung: Open Source ist nicht verschwunden. Die bestimmende Behauptung, AGI bis 2027, entscheidet sich im Januar 2028."),
    ],
    "faqs": [
      ("Worum geht es in Situational Awareness?", "Es ist Leopold Aschenbrenners Essay vom Juni 2024, der argumentiert, AGI sei bis 2027 plausibel, gefolgt von einer Intelligenzexplosion und Superintelligenz in den 2030ern — getrieben von Rechenleistungswachstum, algorithmischen Fortschritten und „Unhobbling“."),
      ("Was hat Situational Awareness vorhergesagt?", "AGI bis 2027, eine Intelligenzexplosion 2027–29, Superintelligenz in den 2030ern, weiteres Rechenleistungswachstum, Billionen-Dollar-Capex, das Verschwinden von Open Source und ein AGI-Projekt der US-Regierung."),
      ("Ist Situational Awareness zutreffend?", "Teilweise. Die Prognosen zu Rechenleistung, Capex und Fähigkeiten haben weitgehend gehalten; die Open-Source-Prognose ist falsch; und die bestimmende Behauptung AGI-2027 ist weiterhin offen und entscheidet sich im Januar 2028."),
    ],
  },
  "pt": {
    "title": "Situational Awareness: resumo e avaliação",
    "desc": "O ensaio de Aschenbrenner defende AGI até 2027. Dois anos depois: o que se confirmou, o que falhou e o que continua em aberto, com veredictos datados.",
    "eyebrow": "Resumo avaliado", "h1": "Situational Awareness, resumido — e avaliado",
    "capsule": '<span class="verdict">A tese de que a AGI está próxima — outrora sustentada por um fundo de US$ 45 bilhões que quebrou em julho de 2026.</span> <em>Situational Awareness</em> (junho de 2024) defende que a AGI é plausível até <strong>2027</strong> e a superinteligência no início da década de 2030, impulsionadas pela escala de computação, ganhos algorítmicos e “unhobbling”. Dois anos depois, suas previsões de tendência se sustentam em boa parte; a aposta no desaparecimento do código aberto está <strong>errada</strong>; a AGI em 2027 continua <strong>em aberto</strong>.',
    "secs": [
      ("O que o ensaio argumenta", "O ensaio de 165 páginas de Leopold Aschenbrenner se apoia na extrapolação de tendências em ordens de grandeza (OOM). A cadeia de raciocínio: a computação continua escalando, os algoritmos continuam melhorando, os modelos são “destravados” (ferramentas, agentes, raciocínio) — e a combinação leva, por volta de 2027, a uma IA capaz de fazer o trabalho de um pesquisador de IA. Isso desencadeia uma explosão de inteligência (2027–29) e superinteligência nos anos 2030, com a segurança nacional assumindo o controle por meio de um “Projeto” governamental."),
      ("As previsões centrais", "<ul><li><strong>AGI até 2027</strong> — IA no nível de um pesquisador de IA automatizado</li><li><strong>Explosão de inteligência 2027–29</strong> — a IA automatiza a pesquisa em IA, comprimindo uma década em um ano</li><li><strong>Superinteligência nos anos 2030</strong></li><li><strong>Escala de computação ~0,5 OOM/ano</strong> e <strong>capex de trilhões de dólares</strong></li><li><strong>O código aberto se apaga</strong>; algoritmos proprietários formam um fosso duradouro dos EUA</li><li><strong>Um projeto de AGI do governo dos EUA</strong> (“O Projeto”) até 2027/28</li></ul>"),
      ("O balanço", "As curvas de entrada nas quais Aschenbrenner apostou — computação, capex, capacidade bruta — em boa parte se sustentaram ou superaram as expectativas. Seu maior erro está na difusão: o código aberto não se apagou. A afirmação que define o ensaio, AGI até 2027, se resolve em janeiro de 2028."),
    ],
    "faqs": [
      ("Sobre o que é Situational Awareness?", "É o ensaio de junho de 2024 de Leopold Aschenbrenner, que defende que a AGI é plausível até 2027, seguida de uma explosão de inteligência e superinteligência nos anos 2030, impulsionadas pela escala de computação, ganhos algorítmicos e “unhobbling”."),
      ("O que Situational Awareness previu?", "AGI até 2027, uma explosão de inteligência em 2027–29, superinteligência nos anos 2030, escala contínua de computação, capex de trilhões de dólares, o desaparecimento do código aberto e um projeto de AGI do governo dos EUA."),
      ("Situational Awareness está correto?", "Em parte. Suas previsões de computação, capex e capacidade se sustentaram em boa medida; a previsão sobre código aberto está errada; e a afirmação definidora, AGI em 2027, continua em aberto e se resolve em janeiro de 2028."),
    ],
  },
  "it": {
    "title": "Situational Awareness: sintesi e valutazione",
    "desc": "Il saggio di Aschenbrenner sostiene l\'AGI entro il 2027. Due anni dopo: cosa regge, cosa ha fallito e cosa resta aperto, con verdetti datati.",
    "eyebrow": "Sintesi valutata", "h1": "Situational Awareness, riassunto — e valutato",
    "capsule": '<span class="verdict">La tesi che l\'AGI sia vicina — un tempo sostenuta da un fondo da 45 miliardi di dollari fallito nel luglio 2026.</span> <em>Situational Awareness</em> (giugno 2024) sostiene che l\'AGI sia plausibile entro il <strong>2027</strong> e la superintelligenza nei primi anni 2030, trainate dalla crescita del calcolo, dai guadagni algoritmici e dall\'“unhobbling”. Due anni dopo, le sue previsioni di tendenza reggono in larga parte; la scommessa sulla scomparsa dell\'open source è <strong>sbagliata</strong>; l\'AGI nel 2027 resta <strong>aperta</strong>.',
    "secs": [
      ("Cosa sostiene il saggio", "Il saggio di 165 pagine di Leopold Aschenbrenner si fonda sull\'estrapolazione di tendenze in ordini di grandezza (OOM). La catena di ragionamento: il calcolo continua a crescere, gli algoritmi continuano a migliorare, i modelli vengono “liberati” (strumenti, agenti, ragionamento) — e insieme portano, verso il 2027, a un\'IA capace di svolgere il lavoro di un ricercatore di IA. Ciò innesca un\'esplosione di intelligenza (2027–29) e la superintelligenza negli anni 2030, con la sicurezza nazionale che subentra tramite un “Progetto” governativo."),
      ("Le previsioni chiave", "<ul><li><strong>AGI entro il 2027</strong> — IA al livello di un ricercatore di IA automatizzato</li><li><strong>Esplosione di intelligenza 2027–29</strong> — l\'IA automatizza la ricerca sull\'IA, comprimendo un decennio in un anno</li><li><strong>Superintelligenza negli anni 2030</strong></li><li><strong>Crescita del calcolo ~0,5 OOM/anno</strong> e <strong>capex da migliaia di miliardi di dollari</strong></li><li><strong>L\'open source svanisce</strong>; gli algoritmi proprietari formano un fossato duraturo per gli USA</li><li><strong>Un progetto AGI del governo USA</strong> (“Il Progetto”) entro il 2027/28</li></ul>"),
      ("Il bilancio", "Le curve di input su cui Aschenbrenner ha scommesso — calcolo, capex, capacità grezza — hanno in larga parte retto o superato le attese. Il suo errore più grande riguarda la diffusione: l\'open source non è svanito. L\'affermazione che definisce il saggio, AGI entro il 2027, si risolve nel gennaio 2028."),
    ],
    "faqs": [
      ("Di cosa parla Situational Awareness?", "È il saggio del giugno 2024 di Leopold Aschenbrenner, che sostiene che l\'AGI sia plausibile entro il 2027, seguita da un\'esplosione di intelligenza e dalla superintelligenza negli anni 2030, trainate dalla crescita del calcolo, dai guadagni algoritmici e dall\'“unhobbling”."),
      ("Cosa ha previsto Situational Awareness?", "AGI entro il 2027, un\'esplosione di intelligenza nel 2027–29, superintelligenza negli anni 2030, crescita continua del calcolo, capex da migliaia di miliardi di dollari, la scomparsa dell\'open source e un progetto AGI del governo statunitense."),
      ("Situational Awareness è accurato?", "In parte. Le previsioni su calcolo, capex e capacità hanno in gran parte retto; la previsione sull\'open source è sbagliata; e l\'affermazione determinante, AGI nel 2027, resta aperta e si risolve nel gennaio 2028."),
    ],
  },
  "ja": {
    "title": "『Situational Awareness』要約と採点",
    "desc": "アッシェンブレナーの論文は2027年AGI説を主張する。2年後の現在、何が持ちこたえ、何が外れ、何が未決かを日付つきの判定で示す。",
    "eyebrow": "採点つき要約", "h1": "『Situational Awareness』を要約し、採点する",
    "capsule": '<span class="verdict">AGIは近いという主張——かつて450億ドルのファンドがこれを支えたが、2026年7月に破綻した。</span><em>Situational Awareness</em>（2024年6月）は、計算資源の拡大、アルゴリズムの改善、そして「アンホブリング」により、<strong>2027年</strong>までのAGIと2030年代前半の超知能がありうると論じる。2年後、トレンドに関する予測はおおむね持ちこたえている。オープンソースが衰退するという読みは<strong>外れ</strong>。2027年AGIは依然<strong>未決</strong>である。',
    "secs": [
      ("論文の主張", "レオポルド・アッシェンブレナーによる165ページの論文は、桁（OOM）単位のトレンドの外挿の上に組み立てられている。論理の連鎖はこうだ——計算資源は拡大し続け、アルゴリズムは改善し続け、モデルは「アンホブリング」（ツール、エージェント、推論）される。これらが合わさって、2027年頃にはAI研究者の仕事をこなせるAIに到達する。それが知能爆発（2027〜29年）を引き起こし、2030年代の超知能へ至る。そして安全保障上の必然として、政府の「プロジェクト」がこれを掌握する。"),
      ("主要な予測", "<ul><li><strong>2027年までのAGI</strong>——自動化されたAI研究者の水準のAI</li><li><strong>2027〜29年の知能爆発</strong>——AIがAI研究を自動化し、10年分を1年に圧縮する</li><li><strong>2030年代の超知能</strong></li><li><strong>計算資源の拡大 年間約0.5 OOM</strong>および<strong>兆ドル規模の設備投資</strong></li><li><strong>オープンソースの衰退</strong>——独自アルゴリズムが米国の持続的な堀を形成する</li><li><strong>米国政府によるAGIプロジェクト</strong>（「ザ・プロジェクト」）が2027/28年までに発足</li></ul>"),
      ("結論", "アッシェンブレナーが賭けた入力側の曲線——計算資源、設備投資、素の能力——は、おおむね持ちこたえたか、期待を上回った。最大の外れは普及の側にある。オープンソースは衰退しなかった。論文を決定づける主張である2027年AGIは、2028年1月に決着する。"),
    ],
    "faqs": [
      ("『Situational Awareness』とは何についての文書ですか？", "レオポルド・アッシェンブレナーが2024年6月に公開した論文です。計算資源の拡大、アルゴリズムの改善、「アンホブリング」を根拠に、2027年までのAGI、その後の知能爆発、2030年代の超知能がありうると論じています。"),
      ("『Situational Awareness』は何を予測しましたか？", "2027年までのAGI、2027〜29年の知能爆発、2030年代の超知能、計算資源の拡大の継続、兆ドル規模の設備投資、オープンソースの衰退、そして米国政府によるAGIプロジェクトです。"),
      ("『Situational Awareness』は当たっていますか？", "部分的に当たっています。計算資源・設備投資・能力に関する予測はおおむね持ちこたえました。オープンソースに関する予測は外れです。そして決定的な主張である2027年AGIは依然として未決で、2028年1月に決着します。"),
    ],
  },
  "ko": {
    "title": "『Situational Awareness』 요약과 채점",
    "desc": "아셴브레너의 에세이는 2027년 AGI를 주장한다. 2년이 지난 지금 무엇이 버텼고 무엇이 틀렸으며 무엇이 미결인지, 날짜가 붙은 판정으로 정리한다.",
    "eyebrow": "채점된 요약", "h1": "『Situational Awareness』 요약 — 그리고 채점",
    "capsule": '<span class="verdict">AGI가 가깝다는 주장 — 한때 450억 달러 펀드가 이를 뒷받침했으나 2026년 7월 무너졌다.</span> <em>Situational Awareness</em>(2024년 6월)는 연산 확장, 알고리즘 개선, 그리고 “언호블링”을 근거로 <strong>2027년</strong>까지의 AGI와 2030년대 초의 초지능이 가능하다고 주장한다. 2년이 지난 지금 추세 예측은 대체로 버티고 있다. 오픈소스가 쇠퇴한다는 판단은 <strong>틀렸다</strong>. 2027년 AGI는 여전히 <strong>미결</strong>이다.',
    "secs": [
      ("에세이의 주장", "레오폴드 아셴브레너의 165쪽짜리 에세이는 자릿수(OOM) 추세의 외삽 위에 세워져 있다. 논리의 사슬은 이렇다 — 연산은 계속 확장되고, 알고리즘은 계속 개선되며, 모델은 “언호블링”(도구, 에이전트, 추론)된다. 이것들이 합쳐져 2027년 무렵 AI 연구자의 일을 해낼 수 있는 AI에 도달한다. 그것이 지능 폭발(2027~29년)을 촉발하고 2030년대의 초지능으로 이어지며, 국가안보 논리에 따라 정부의 “프로젝트”가 이를 넘겨받는다."),
      ("핵심 예측", "<ul><li><strong>2027년까지 AGI</strong> — 자동화된 AI 연구자 수준의 AI</li><li><strong>2027~29년 지능 폭발</strong> — AI가 AI 연구를 자동화해 10년을 1년으로 압축</li><li><strong>2030년대 초지능</strong></li><li><strong>연산 확장 연 약 0.5 OOM</strong>과 <strong>조 달러 규모 설비투자</strong></li><li><strong>오픈소스의 쇠퇴</strong>; 독점 알고리즘이 미국의 지속적 해자를 형성</li><li><strong>미국 정부 AGI 프로젝트</strong>(“더 프로젝트”)가 2027/28년까지 출범</li></ul>"),
      ("결론", "아셴브레너가 베팅한 입력 측 곡선 — 연산, 설비투자, 원시 역량 — 은 대체로 버텼거나 기대를 넘어섰다. 가장 큰 실패는 확산 쪽에 있다. 오픈소스는 쇠퇴하지 않았다. 이 에세이를 규정하는 주장인 2027년 AGI는 2028년 1월에 판가름 난다."),
    ],
    "faqs": [
      ("『Situational Awareness』는 무엇에 관한 글인가요?", "레오폴드 아셴브레너가 2024년 6월에 발표한 에세이로, 연산 확장·알고리즘 개선·“언호블링”을 근거로 2027년까지의 AGI, 뒤이은 지능 폭발과 2030년대 초지능이 가능하다고 주장합니다."),
      ("『Situational Awareness』는 무엇을 예측했나요?", "2027년까지의 AGI, 2027~29년의 지능 폭발, 2030년대의 초지능, 연산 확장의 지속, 조 달러 규모의 설비투자, 오픈소스의 쇠퇴, 그리고 미국 정부의 AGI 프로젝트입니다."),
      ("『Situational Awareness』는 정확한가요?", "부분적으로 맞습니다. 연산·설비투자·역량에 관한 예측은 대체로 버텼고, 오픈소스 예측은 틀렸으며, 이 글을 규정하는 2027년 AGI 주장은 여전히 미결로 2028년 1월에 판가름 납니다."),
    ],
  },
}


# ---- ai-orders-of-magnitude-explained（引用放大队列第 2 项：18 次引用、零翻译。
# 同样是英文原页的忠实翻译；0.5 OOM/年、±0.5 OOM 等数字照搬，不新增事实。）----
PAGES["ai-orders-of-magnitude-explained"] = {
  "zh": True,   # zh 版已由 gen_zh_citation_pages.py 生成 → 纳入 hreflang/langbar
  "en_title": "AI “orders of magnitude” (OOMs), explained",
  "es": {
    "title": "Órdenes de magnitud (OOM) en IA, explicados",
    "desc": "Un OOM es un factor de 10. Toda la tesis AGI-2027 de Aschenbrenner es una suma de OOMs de cómputo efectivo a ~0,5 OOM/año. Cómo va ese ritmo.",
    "eyebrow": "Método", "h1": "Los «órdenes de magnitud» (OOM) de la IA, explicados",
    "capsule": '<span class="verdict">El método de conteo detrás del pronóstico de 2027.</span> Un orden de magnitud (OOM) es un factor de 10. Todo el caso AGI de Aschenbrenner se basa en contar OOMs de <strong>cómputo efectivo</strong> — cómputo bruto + eficiencia algorítmica + «unhobbling» — y apostar a que se acumulan a ~<strong>0,5 OOM/año</strong> hasta la AGI en 2027. Dos años después, el ritmo <strong>se ha mantenido aproximadamente</strong>.',
    "secs": [
      ("Qué es un OOM", "Un orden de magnitud = 10×. Dos OOMs = 100×. Aschenbrenner razona en OOMs porque el progreso de la IA es exponencial: es más fácil seguir «cuántos 10× por año» que las cifras absolutas. Su pronóstico es en esencia un problema de suma — apila suficientes OOMs de cómputo efectivo y cruzas el umbral de la AGI."),
      ("Las tres fuentes de OOMs", "<ul><li><strong>Cómputo bruto</strong> — entrenamientos más grandes</li><li><strong>Eficiencia algorítmica</strong> — más capacidad por FLOP</li><li><strong>Unhobbling</strong> — desbloquear capacidad latente (razonamiento, herramientas, agentes)</li></ul>"),
      ("La apuesta y cómo va", "Proyectó unos <strong>0,5 OOM/año</strong> de cómputo efectivo, de forma sostenida. A mediados de 2026 una auditoría independiente califica el ritmo de «aproximadamente respaldado», con lanzamientos dispersos dentro de unos ±0,5 OOM de la tendencia. Este motor de OOMs es lo que sostiene toda afirmación posterior: capacidad, fecha de la AGI y explosión de inteligencia. Si los OOMs dejan de acumularse, todo el caso de 2027 se retrasa."),
    ],
    "faqs": [
      ("¿Qué son los órdenes de magnitud en IA?", "Un orden de magnitud (OOM) es un factor de 10. Aschenbrenner cuenta OOMs de «cómputo efectivo» — cómputo bruto más eficiencia algorítmica más unhobbling — porque el progreso de la IA es exponencial y resulta más fácil seguirlo como «10× por año»."),
      ("¿Cuántos OOMs por año predijo Aschenbrenner?", "Aproximadamente 0,5 órdenes de magnitud de cómputo efectivo al año, sostenidos durante la década. A mediados de 2026 el ritmo se ha mantenido en líneas generales."),
      ("¿Por qué importan los OOMs para la AGI?", "Porque su pronóstico de AGI es en esencia un problema de suma: apila suficientes OOMs de cómputo efectivo y cruzas el umbral. Si los OOMs dejan de acumularse, el calendario de 2027 se retrasa."),
    ],
  },
  "fr": {
    "title": "Les « ordres de grandeur » (OOM) en IA, expliqués",
    "desc": "Un OOM vaut un facteur 10. Toute la thèse AGI-2027 d\'Aschenbrenner est une addition d\'OOM de calcul effectif à ~0,5 OOM/an. Où en est ce rythme.",
    "eyebrow": "Méthode", "h1": "Les « ordres de grandeur » (OOM) de l\'IA, expliqués",
    "capsule": '<span class="verdict">La méthode de comptage derrière la prévision 2027.</span> Un ordre de grandeur (OOM) vaut un facteur 10. Tout l\'argumentaire AGI d\'Aschenbrenner repose sur le comptage d\'OOM de <strong>calcul effectif</strong> — calcul brut + efficacité algorithmique + « unhobbling » — en pariant qu\'ils s\'accumulent à ~<strong>0,5 OOM/an</strong> jusqu\'à l\'AGI en 2027. Deux ans plus tard, le rythme <strong>a globalement tenu</strong>.',
    "secs": [
      ("Ce qu\'est un OOM", "Un ordre de grandeur = 10×. Deux OOM = 100×. Aschenbrenner raisonne en OOM parce que le progrès de l\'IA est exponentiel : il est plus simple de suivre « combien de 10× par an » que des valeurs absolues. Sa prévision est pour l\'essentiel une addition — empilez assez d\'OOM de calcul effectif et vous franchissez le seuil de l\'AGI."),
      ("Les trois sources d\'OOM", "<ul><li><strong>Calcul brut</strong> — des entraînements plus vastes</li><li><strong>Efficacité algorithmique</strong> — plus de capacité par FLOP</li><li><strong>Unhobbling</strong> — libérer la capacité latente (raisonnement, outils, agents)</li></ul>"),
      ("Le pari, et où il en est", "Il tablait sur environ <strong>0,5 OOM/an</strong> de calcul effectif, de façon soutenue. À la mi-2026, un audit indépendant qualifie le rythme de « globalement conforme », les lancements se répartissant à environ ±0,5 OOM de la tendance. Ce moteur d\'OOM est ce qui sous-tend chaque affirmation en aval : capacité, calendrier de l\'AGI, explosion d\'intelligence. Si les OOM cessent de s\'empiler, tout le dossier 2027 glisse."),
    ],
    "faqs": [
      ("Que sont les ordres de grandeur en IA ?", "Un ordre de grandeur (OOM) vaut un facteur 10. Aschenbrenner compte les OOM de « calcul effectif » — calcul brut, plus efficacité algorithmique, plus unhobbling — parce que le progrès de l\'IA est exponentiel et plus simple à suivre en « 10× par an »."),
      ("Combien d\'OOM par an Aschenbrenner a-t-il prédit ?", "Environ 0,5 ordre de grandeur de calcul effectif par an, soutenu sur la décennie. À la mi-2026, le rythme a globalement tenu."),
      ("Pourquoi les OOM comptent-ils pour l\'AGI ?", "Parce que sa prévision d\'AGI est pour l\'essentiel une addition : empilez assez d\'OOM de calcul effectif et vous franchissez le seuil. Si les OOM cessent de s\'empiler, le calendrier 2027 glisse."),
    ],
  },
  "de": {
    "title": "„Größenordnungen“ (OOMs) in der KI, erklärt",
    "desc": "Ein OOM ist der Faktor 10. Aschenbrenners gesamte AGI-2027-These ist eine Addition von OOMs effektiver Rechenleistung bei ~0,5 OOM/Jahr. Wie das Tempo läuft.",
    "eyebrow": "Methode", "h1": "KI-„Größenordnungen“ (OOMs), erklärt",
    "capsule": '<span class="verdict">Die Zählmethode hinter der 2027-Prognose.</span> Eine Größenordnung (OOM) ist der Faktor 10. Aschenbrenners gesamte AGI-Argumentation beruht darauf, OOMs <strong>effektiver Rechenleistung</strong> zu zählen — rohe Rechenleistung + algorithmische Effizienz + „Unhobbling“ — und darauf zu wetten, dass sie sich mit ~<strong>0,5 OOM/Jahr</strong> bis zur AGI 2027 aufsummieren. Zwei Jahre später hat das Tempo <strong>weitgehend gehalten</strong>.',
    "secs": [
      ("Was ein OOM ist", "Eine Größenordnung = 10×. Zwei OOMs = 100×. Aschenbrenner denkt in OOMs, weil KI-Fortschritt exponentiell verläuft: Es ist einfacher, „wie viele 10× pro Jahr“ zu verfolgen als absolute Zahlen. Seine Prognose ist im Kern eine Additionsaufgabe — stapelt man genug OOMs effektiver Rechenleistung, überschreitet man die AGI-Schwelle."),
      ("Die drei Quellen von OOMs", "<ul><li><strong>Rohe Rechenleistung</strong> — größere Trainingsläufe</li><li><strong>Algorithmische Effizienz</strong> — mehr Fähigkeit pro FLOP</li><li><strong>Unhobbling</strong> — latente Fähigkeiten freisetzen (Reasoning, Werkzeuge, Agenten)</li></ul>"),
      ("Die Wette und wie sie läuft", "Er veranschlagte grob <strong>0,5 OOM/Jahr</strong> effektiver Rechenleistung, dauerhaft. Mit Stand Mitte 2026 nennt ein unabhängiges Audit das Tempo „weitgehend gestützt“, wobei die Veröffentlichungen etwa ±0,5 OOM um den Trend streuen. Dieser OOM-Motor liegt unter jeder nachgelagerten Behauptung: Fähigkeit, AGI-Zeitpunkt und Intelligenzexplosion. Hören die OOMs auf, sich zu stapeln, verschiebt sich der gesamte 2027-Fall."),
    ],
    "faqs": [
      ("Was sind Größenordnungen in der KI?", "Eine Größenordnung (OOM) ist der Faktor 10. Aschenbrenner zählt OOMs „effektiver Rechenleistung“ — rohe Rechenleistung plus algorithmische Effizienz plus Unhobbling — weil KI-Fortschritt exponentiell ist und sich leichter als „10× pro Jahr“ verfolgen lässt."),
      ("Wie viele OOMs pro Jahr sagte Aschenbrenner voraus?", "Rund 0,5 Größenordnungen effektiver Rechenleistung pro Jahr, dauerhaft über das Jahrzehnt. Mit Stand Mitte 2026 hat das Tempo weitgehend gehalten."),
      ("Warum sind OOMs für AGI wichtig?", "Weil seine AGI-Prognose im Kern eine Additionsaufgabe ist: Stapelt man genug OOMs effektiver Rechenleistung, überschreitet man die Schwelle. Hören die OOMs auf, sich zu stapeln, verschiebt sich der Zeitplan für 2027."),
    ],
  },
  "pt": {
    "title": "“Ordens de magnitude” (OOMs) em IA, explicadas",
    "desc": "Um OOM é um fator de 10. Toda a tese AGI-2027 de Aschenbrenner é uma soma de OOMs de computação efetiva a ~0,5 OOM/ano. Como esse ritmo está indo.",
    "eyebrow": "Método", "h1": "As “ordens de magnitude” (OOMs) da IA, explicadas",
    "capsule": '<span class="verdict">O método de contagem por trás da previsão de 2027.</span> Uma ordem de magnitude (OOM) é um fator de 10. Todo o argumento de AGI de Aschenbrenner se baseia em contar OOMs de <strong>computação efetiva</strong> — computação bruta + eficiência algorítmica + “unhobbling” — apostando que se acumulam a ~<strong>0,5 OOM/ano</strong> rumo à AGI em 2027. Dois anos depois, o ritmo <strong>se manteve aproximadamente</strong>.',
    "secs": [
      ("O que é um OOM", "Uma ordem de magnitude = 10×. Duas OOMs = 100×. Aschenbrenner raciocina em OOMs porque o progresso da IA é exponencial: é mais fácil acompanhar “quantos 10× por ano” do que números absolutos. Sua previsão é, em essência, um problema de soma — empilhe OOMs suficientes de computação efetiva e você cruza o limiar da AGI."),
      ("As três fontes de OOMs", "<ul><li><strong>Computação bruta</strong> — treinamentos maiores</li><li><strong>Eficiência algorítmica</strong> — mais capacidade por FLOP</li><li><strong>Unhobbling</strong> — destravar capacidade latente (raciocínio, ferramentas, agentes)</li></ul>"),
      ("A aposta e como ela está indo", "Ele projetou cerca de <strong>0,5 OOM/ano</strong> de computação efetiva, de forma sustentada. Em meados de 2026, uma auditoria independente classifica o ritmo como “aproximadamente sustentado”, com lançamentos dispersos dentro de cerca de ±0,5 OOM da tendência. Esse motor de OOMs é o que sustenta toda afirmação subsequente: capacidade, data da AGI e explosão de inteligência. Se as OOMs pararem de se acumular, todo o caso de 2027 escorrega."),
    ],
    "faqs": [
      ("O que são ordens de magnitude em IA?", "Uma ordem de magnitude (OOM) é um fator de 10. Aschenbrenner conta OOMs de “computação efetiva” — computação bruta mais eficiência algorítmica mais unhobbling — porque o progresso da IA é exponencial e mais fácil de acompanhar como “10× por ano”."),
      ("Quantas OOMs por ano Aschenbrenner previu?", "Cerca de 0,5 ordem de magnitude de computação efetiva por ano, sustentada ao longo da década. Em meados de 2026, o ritmo se manteve aproximadamente."),
      ("Por que as OOMs importam para a AGI?", "Porque sua previsão de AGI é essencialmente um problema de soma: empilhe OOMs suficientes de computação efetiva e você cruza o limiar. Se as OOMs pararem de se acumular, o cronograma de 2027 escorrega."),
    ],
  },
  "it": {
    "title": "Gli “ordini di grandezza” (OOM) nell\'IA, spiegati",
    "desc": "Un OOM è un fattore 10. L\'intera tesi AGI-2027 di Aschenbrenner è una somma di OOM di calcolo efficace a ~0,5 OOM/anno. Come sta andando quel ritmo.",
    "eyebrow": "Metodo", "h1": "Gli “ordini di grandezza” (OOM) dell\'IA, spiegati",
    "capsule": '<span class="verdict">Il metodo di conteggio dietro la previsione del 2027.</span> Un ordine di grandezza (OOM) è un fattore 10. L\'intero argomento AGI di Aschenbrenner si basa sul contare gli OOM di <strong>calcolo efficace</strong> — calcolo grezzo + efficienza algoritmica + “unhobbling” — scommettendo che si accumulino a ~<strong>0,5 OOM/anno</strong> verso l\'AGI nel 2027. Due anni dopo, il ritmo <strong>ha grosso modo tenuto</strong>.',
    "secs": [
      ("Che cos\'è un OOM", "Un ordine di grandezza = 10×. Due OOM = 100×. Aschenbrenner ragiona in OOM perché il progresso dell\'IA è esponenziale: è più semplice seguire “quanti 10× all\'anno” che i numeri assoluti. La sua previsione è in sostanza un\'addizione — impila abbastanza OOM di calcolo efficace e superi la soglia dell\'AGI."),
      ("Le tre fonti di OOM", "<ul><li><strong>Calcolo grezzo</strong> — addestramenti più grandi</li><li><strong>Efficienza algoritmica</strong> — più capacità per FLOP</li><li><strong>Unhobbling</strong> — sbloccare capacità latenti (ragionamento, strumenti, agenti)</li></ul>"),
      ("La scommessa e come sta andando", "Ha proiettato circa <strong>0,5 OOM/anno</strong> di calcolo efficace, in modo sostenuto. A metà 2026 un audit indipendente definisce il ritmo “grosso modo supportato”, con i lanci distribuiti entro circa ±0,5 OOM dal trend. Questo motore di OOM è ciò che sta sotto ogni affermazione a valle: capacità, tempistica dell\'AGI ed esplosione di intelligenza. Se gli OOM smettono di accumularsi, l\'intero caso 2027 slitta."),
    ],
    "faqs": [
      ("Che cosa sono gli ordini di grandezza nell\'IA?", "Un ordine di grandezza (OOM) è un fattore 10. Aschenbrenner conta gli OOM di “calcolo efficace” — calcolo grezzo più efficienza algoritmica più unhobbling — perché il progresso dell\'IA è esponenziale e più facile da seguire come “10× all\'anno”."),
      ("Quanti OOM all\'anno ha previsto Aschenbrenner?", "Circa 0,5 ordini di grandezza di calcolo efficace all\'anno, sostenuti nel corso del decennio. A metà 2026 il ritmo ha grosso modo tenuto."),
      ("Perché gli OOM contano per l\'AGI?", "Perché la sua previsione sull\'AGI è in sostanza un\'addizione: impila abbastanza OOM di calcolo efficace e superi la soglia. Se gli OOM smettono di accumularsi, la tempistica del 2027 slitta."),
    ],
  },
  "ja": {
    "title": "AIの「桁（OOM）」とは何か",
    "desc": "1 OOM は 10 倍。アッシェンブレナーの2027年AGI論は、実効計算量の桁を年0.5 OOMで足し上げる計算にすぎない。その進み具合を検証する。",
    "eyebrow": "方法", "h1": "AIの「桁（OOM）」を解説する",
    "capsule": '<span class="verdict">2027年予測の背後にある数え方。</span>1桁（OOM）とは10倍を指す。アッシェンブレナーのAGI論は、<strong>実効計算量</strong>——生の計算量＋アルゴリズム効率＋「アンホブリング」——の桁を数え、それが年<strong>約0.5 OOM</strong>ずつ積み上がって2027年のAGIに至る、という賭けの上に成り立っている。2年後、そのペースは<strong>おおむね保たれている</strong>。',
    "secs": [
      ("OOMとは何か", "1桁＝10倍。2桁＝100倍。アッシェンブレナーが桁で考えるのは、AIの進歩が指数的だからだ。絶対値を追うより「年に何回の10倍か」を追うほうが扱いやすい。彼の予測は本質的に足し算の問題である——実効計算量の桁を十分に積み上げれば、AGIの閾値を超える。"),
      ("桁を生む3つの源", "<ul><li><strong>生の計算量</strong>——より大規模な学習</li><li><strong>アルゴリズム効率</strong>——FLOPあたりの能力向上</li><li><strong>アンホブリング</strong>——潜在能力の解放（推論、ツール、エージェント）</li></ul>"),
      ("賭けの現在地", "彼は実効計算量を年<strong>約0.5 OOM</strong>、持続的に伸びると見込んだ。2026年半ば時点で、独立した検証はこのペースを「おおむね支持される」と評価しており、各リリースはトレンドから概ね±0.5 OOMの範囲に散らばっている。この桁の積み上げエンジンこそが、その先のあらゆる主張——能力、AGIの時期、知能爆発——の土台にある。桁が積み上がらなくなれば、2027年論全体が後ろにずれる。"),
    ],
    "faqs": [
      ("AIにおける「桁（OOM）」とは何ですか？", "1桁（OOM）とは10倍のことです。アッシェンブレナーは「実効計算量」の桁——生の計算量、アルゴリズム効率、アンホブリングの合計——を数えます。AIの進歩は指数的であり、「年に何回の10倍か」として追うほうが扱いやすいからです。"),
      ("アッシェンブレナーは年に何OOMと予測しましたか？", "実効計算量で年およそ0.5桁、これを10年にわたり持続すると予測しました。2026年半ば時点で、このペースはおおむね保たれています。"),
      ("なぜ桁がAGIにとって重要なのですか？", "彼のAGI予測が本質的に足し算の問題だからです。実効計算量の桁を十分に積み上げれば閾値を超えます。桁が積み上がらなくなれば、2027年の日程は後ろにずれます。"),
    ],
  },
  "ko": {
    "title": "AI의 “자릿수(OOM)” 설명",
    "desc": "1 OOM은 10배다. 아셴브레너의 2027년 AGI 논증은 실효 연산량의 자릿수를 연 0.5 OOM씩 더하는 계산이다. 그 속도가 어떻게 가고 있는지 본다.",
    "eyebrow": "방법", "h1": "AI의 “자릿수(OOM)”를 설명한다",
    "capsule": '<span class="verdict">2027년 예측 뒤에 있는 셈법.</span> 한 자릿수(OOM)는 10배를 뜻한다. 아셴브레너의 AGI 논증 전체는 <strong>실효 연산량</strong>의 자릿수를 세는 데 기반한다 — 원시 연산량 + 알고리즘 효율 + “언호블링” — 그리고 그것이 연 <strong>약 0.5 OOM</strong>씩 쌓여 2027년 AGI에 이른다는 데 베팅한다. 2년이 지난 지금 그 속도는 <strong>대체로 유지되었다</strong>.',
    "secs": [
      ("OOM이란 무엇인가", "한 자릿수 = 10배. 두 자릿수 = 100배. 아셴브레너가 자릿수로 사고하는 이유는 AI 진보가 지수적이기 때문이다. 절대 수치보다 “연간 몇 번의 10배인가”를 추적하는 편이 쉽다. 그의 예측은 본질적으로 덧셈 문제다 — 실효 연산량의 자릿수를 충분히 쌓으면 AGI 문턱을 넘는다."),
      ("자릿수를 만드는 세 가지 원천", "<ul><li><strong>원시 연산량</strong> — 더 큰 학습 실행</li><li><strong>알고리즘 효율</strong> — FLOP당 더 큰 역량</li><li><strong>언호블링</strong> — 잠재 역량의 해방(추론, 도구, 에이전트)</li></ul>"),
      ("베팅의 현재 위치", "그는 실효 연산량이 연 <strong>약 0.5 OOM</strong>씩 지속적으로 늘어난다고 전망했다. 2026년 중반 기준으로 독립적인 감사는 이 속도를 “대체로 뒷받침된다”고 평가하며, 출시들은 추세선에서 대략 ±0.5 OOM 범위에 흩어져 있다. 이 자릿수 엔진이 이후의 모든 주장 — 역량, AGI 시점, 지능 폭발 — 을 떠받친다. 자릿수가 더 이상 쌓이지 않으면 2027년 논증 전체가 뒤로 밀린다."),
    ],
    "faqs": [
      ("AI에서 자릿수(OOM)란 무엇인가요?", "한 자릿수(OOM)는 10배를 뜻합니다. 아셴브레너는 “실효 연산량”의 자릿수 — 원시 연산량에 알고리즘 효율과 언호블링을 더한 것 — 를 셉니다. AI 진보가 지수적이어서 “연간 몇 번의 10배”로 추적하는 편이 쉽기 때문입니다."),
      ("아셴브레너는 연간 몇 OOM을 예측했나요?", "실효 연산량 기준 연 약 0.5 자릿수를, 10년에 걸쳐 지속적으로 예측했습니다. 2026년 중반 기준 그 속도는 대체로 유지되었습니다."),
      ("왜 OOM이 AGI에 중요한가요?", "그의 AGI 예측이 본질적으로 덧셈 문제이기 때문입니다. 실효 연산량의 자릿수를 충분히 쌓으면 문턱을 넘습니다. 자릿수가 더 이상 쌓이지 않으면 2027년 일정은 뒤로 밀립니다."),
    ],
  },
}


def main():
    written = []
    for slug, data in PAGES.items():
        has_zh = data.get("zh", False)
        for l in LANGS:
            os.makedirs(os.path.join(ROOT, l), exist_ok=True)
            html = build_page(slug, l, data, has_zh, LANGS)
            path = os.path.join(ROOT, l, f"{slug}.html")
            open(path, "w", encoding="utf-8").write(html)
            written.append(f"{l}/{slug}.html")
    for w in written:
        print("wrote", w)
    print(f"TOTAL: {len(written)} pages")

if __name__ == "__main__":
    main()
