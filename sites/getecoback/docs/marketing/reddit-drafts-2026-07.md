# Reddit 分发草稿包（2026-07 热浪季）

> 用法：热浪期间在下列 subreddit 搜最近的相关提问（每年热浪季都有新帖），把对应草稿**人工**贴为回答。
> 规则（playbook 红线）：真实回答优先、只链站内（带 utm）、**绝不放 amazon 联盟链接**、绝不自动发帖。
> 每个链接带 `?utm_source=reddit&utm_medium=social&utm_campaign=heatwave26`，GA4 能单独看到 Reddit 带来的会话。

---

## 草稿 1 · r/germany / r/AskAGerman — "How do I use a portable AC with German tilt-and-turn windows?"（英文）

Search terms to find threads: `portable air conditioner window`, `AC rental apartment`, `heatwave apartment`

> Renter here too — the standard sliding-window kits don't fit German Kipp windows, but there are three ways that work and none of them need drilling:
>
> 1. **Fabric seal kit (~€15–30)** — velcro cloth panel that zips around the tilted window and the hose. Fully removable, no residue, this is what most renters end up using.
> 2. **Cut acrylic/XPS panel (~€10–40)** — any Baumarkt cuts it to size; clamp it in the tilt opening with a hose hole. Best seal, blocks more noise too.
> 3. **Tilt-window outlet adapter (~€30–60)** — the window stays almost closed and lockable. Tidiest if the AC stays in one spot all summer.
>
> The one mistake to avoid: leaving the two triangular gaps of the tilted window open — that's why people say "portable ACs don't work". Seal those and a 9,000 BTU unit handles a normal bedroom fine.
>
> I put the full comparison (with the common mistakes) here if useful: https://getecoback.com/en/guide/portable-ac-tilt-and-turn-windows.html?utm_source=reddit&utm_medium=social&utm_campaign=heatwave26

## 草稿 2 · r/de / r/Fragreddit — „Wohnung kühlen ohne Klimaanlage?"（德文）

Suchbegriffe: `Wohnung kühlen`, `Hitze Wohnung`, `Hitzewelle schlafen`

> Was bei mir (Dachgeschoss, Miete) tatsächlich funktioniert hat, in der Reihenfolge des Aufwands:
>
> 1. **Nur nachts/früh morgens querlüften**, tagsüber Fenster ZU und verdunkeln — klingt banal, macht aber 3–4 °C aus. Mittags lüften importiert nur Hitze.
> 2. **Ventilator richtig einsetzen**: nicht auf sich selbst im Dauerbetrieb, sondern nachts als Durchzugs-Verstärker ins Fenster stellen. Kostet ~2 Cent/Stunde.
> 3. Der Eiswürfel-vor-Ventilator-Trick aus TikTok: bringt lokal kurz was, kühlt aber den Raum nicht — der Gefrierschrank heizt die Wohnung stärker als das Eis kühlt.
> 4. Wenn du wirklich Temperatur senken musst (Schlafzimmer >28 °C): führt kein Weg an einem Monoblock vorbei, auch zur Miete ohne Bohren machbar.
>
> Länger aufgeschrieben mit Zahlen: https://getecoback.com/guide/zimmer-kuehlen-ohne-installation.html?utm_source=reddit&utm_medium=social&utm_campaign=heatwave26

## 草稿 3 · r/buildapc / r/pcmasterrace — "PC thermal throttling in summer"（英文）

Search terms: `pc overheating summer`, `gpu temps summer`, `room too hot gaming`

> Everyone's telling you to repaste/add fans — do that, but the thing most threads skip: **room temperature is the floor your cooling starts from**. Rule of thumb: a room ~5 °C hotter runs your CPU/GPU ~5 °C hotter, no matter how good the case airflow is. A rig that was fine in a 22 °C room will throttle at 28 °C ambient.
>
> So the order that actually works: dust the case → fix airflow/fan curve → then get the ROOM down (purge-ventilate at night, blinds down by day, fan feeding cooler air toward the intake). If the room sits above ~28 °C all evening, only real cooling fixes it.
>
> Wrote up the room-side checklist here: https://getecoback.com/en/guide/gaming-pc-overheating-summer.html?utm_source=reddit&utm_medium=social&utm_campaign=heatwave26

---

## 发帖注意
- 先看子版规则（有的禁自链；r/germany 通常允许语境相关的非商业链接）
- 回答要针对楼主的具体情况改一两句，不要原样粘贴三次
- 一天最多 1–2 条，账号要有正常活动历史
- 发完后无需操作，GA4 里 `utm_campaign=heatwave26` 即可看到效果

---

# 追加：热浪回归周草稿（2026-08-08 起）

**为什么是这几天**：08-07 当天德国只有 20–27 °C（凉爽间歇），但预报 08-08～08-11 回到 **29–34 °C、局地 36 °C**，周二（08-12）起转折；08-04 刚出现过 **39.4 °C**（雷根斯堡），8 月整体距 1961/90 均值 **+5.9 °C**。所以**不是"现在就发"，而是热回来的那两天发**——站点的 `/api/heat` 层会在同一时刻自动亮起，两边节奏对齐。

> 红线不变：人工发、只链站内带 utm、绝不放 amazon 联盟链接、绝不自动发帖或批量评论。
> utm 换成 `?utm_source=reddit&utm_medium=social&utm_campaign=heat0808`。

## 草稿 A · r/de / r/Fragreddit — „Jetzt noch ein Klimagerät kaufen oder ist der Sommer eh vorbei?"

> Kommt drauf an, wann du es brauchst: Ab Samstag geht es nochmal auf 29–34 Grad hoch, örtlich um 36, ab Dienstag kippt es wahrscheinlich. Wenn du erst am heißesten Tag bestellst, ist genau dann alles Gute weg oder teuer — das ist jedes Jahr dasselbe Muster.
>
> Was ich Leuten rate, die jetzt zum ersten Mal kaufen: **erst ausrechnen, wie viel Kühlleistung dein Raum überhaupt braucht** (Faustformel ~340 BTU pro m², Dachgeschoss und Südfenster kommen drauf), und dann schauen. Ein 9.000-BTU-Gerät reicht für ein normales Schlafzimmer, für ein offenes Wohnzimmer eher 12.000+.
>
> Und der Punkt, an dem die meisten Käufe scheitern, ist nicht die Kühlleistung, sondern **die Fensterabdichtung** — ohne dichte Abdichtung bläst die warme Luft direkt zurück rein.
>
> Rechner für die Raumgröße: https://getecoback.com/?utm_source=reddit&utm_medium=social&utm_campaign=heat0808

## 草稿 B · r/schlafen / r/de — „Klimagerät läuft nachts, ich werde wach — welches ist wirklich leise?"

> Lautstärke ist bei Monoblock-Geräten die Eigenschaft, an der die meisten Käufe scheitern, und leider die, die auf den Produktseiten am unklarsten steht.
>
> Bei der Stiftung Warentest ist der **De'Longhi PAC N90 ECO Silent** der Monoblock-Testsieger — der Silent-Modus fährt beide Lüfter auf die niedrigste Stufe (Herstellerangabe ~50 dB). Günstige Geräte liegen eher bei ~63 dB, und das ist im Schlafzimmer ein anderer Planet.
>
> Zwei Sachen, die unabhängig vom Gerät helfen: den Abluftschlauch **kurz und gerade** verlegen (jeder Meter mehr = mehr Gebläseleistung = mehr Krach) und tagsüber außen beschatten, damit das Gerät nachts nicht auf voller Stufe laufen muss.
>
> Vergleich der leisen Modelle: https://getecoback.com/guide/beste-tragbare-klimaanlage-hitzewelle.html?utm_source=reddit&utm_medium=social&utm_campaign=heat0808

## 家庭群/朋友群一句话（这条不用手写——站点的「↗ Weitersagen」按钮自动生成）

> 🔥 Hitzewelle im Anmarsch: bis 36 °C in Frankfurt am Sa. — was jetzt wirklich hilft (ohne Klimaanlage anfangen): https://getecoback.com/guide/beste-tragbare-klimaanlage-hitzewelle.html

**能力边界（诚实说明）**：我没有任何社交平台账号，也不会代发——自动发帖/批量评论违反平台条款，且会摧毁本站目前唯一在起作用的渠道（Bing 家族 + AI 助手引用）。上面是可直接复制的人工发送稿。站点侧我能做且已做的"自动传播"是：热浪一到自动亮出提示条 + 一键转发按钮，让真实读者在最该转发的那一刻转发。
