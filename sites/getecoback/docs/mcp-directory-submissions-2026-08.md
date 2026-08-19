# MCP-Verzeichnisse: Status, blockierte Schritte und fertige Einreichungen

Stand 2026-08-16. Ergänzt Regel 二 in `CLAUDE.md` (Auffindbarkeit ist Arbeit,
kein Nebenprodukt). Alles, was ohne Owner geht, ist erledigt; alles andere steht
hier kopierfertig, mit dem Grund, warum es nicht automatisierbar war.

## 1. Offizielles MCP Registry — erledigt und verifiziert

Direkt gegen die Registry-API geprüft (nicht aus dem Log geschlossen):

```
GET https://registry.modelcontextprotocol.io/v0/servers?search=hvac-btu-heat-klimaanlage
→ io.github.f-tiger/hvac-btu-heat-klimaanlage  v1.0.0  active
→ io.github.f-tiger/hvac-btu-heat-klimaanlage  v1.1.0  active (Latest)
   "BTU sizing, window-seal length, heatwave outlook, running costs, balcony solar subsidies (DE/EU)."
   remote: https://getecoback.com/mcp/v1
```

v1.1.0 ist die aktuelle Version, die Beschreibung enthält das neue Förder-Thema.
Veröffentlichung läuft über `.github/workflows/publish-mcp.yml` (GitHub OIDC,
keine Secrets); jede Änderung an `mcp/**` publiziert automatisch.

**Warum das der wichtigste Eintrag ist:** Das GitHub-MCP-Registry ist eine echte
Sub-Registry — Einträge erscheinen dort automatisch aus dem offiziellen Registry,
ohne zweite Einreichung. Smithery, Raycast, MCP.so, PulseMCP und FluidMCP sind
dagegen *parallele* Verzeichnisse und verlangen jeweils eine eigene Einreichung.

## 2. Produktionsprüfung — erledigt

`tools/mcp_smoke.mjs` (+ `.github/workflows/mcp-smoke.yml`) ruft gegen den
Live-Server: `initialize`, `tools/list` und **einen echten Call pro Tool**, und
prüft je Antwort auf den Wert, den der Rechner der Website selbst ausgibt, plus
Quell-URL und Affiliate-Hinweis. Läuft auf Abruf, nach jeder Worker-Änderung und
täglich um 06:17 UTC.

Das ist der Standard, den ein Verzeichniseintrag verlangt: Wer Dritte auf einen
Endpunkt zeigt, muss mehr wissen als „antwortet überhaupt".

## 3. Glama — eingereicht am 2026-08-16, Review läuft

Über das Formular *Add MCP Server → **Server*** (nicht Connector: der von
awesome-mcp-servers geforderte Badge existiert nur unter dem Servers-Pfad
`/mcp/servers/OWNER/REPO/badges/score.svg`). Eingereicht wurden:

| Feld | Wert |
|---|---|
| Name | EcoBack Raumklima MCP |
| GitHub Repository URL | `https://github.com/f-tiger/getecoback-mcp` |
| Description | Nine tools for indoor climate and household energy in Germany/EU … no auth, no personal data, every answer returns its source URL. |

Öffentliche Einreichungen werden **vor der Veröffentlichung geprüft** — die
Sichtbarkeit kommt also verzögert, nicht sofort.

**Was Glama dabei prüft**, laut dem Bot in PR #12245: der Server muss in einem
Container **starten und auf Introspection antworten**. Dafür liegt eine
`Dockerfile` im Repo-Root (Node + zwei Dateien, kein Install-Schritt, weil der
Server keine Laufzeit-Abhängigkeiten hat), und **genau diese Prüfung läuft bei
uns selbst in CI**: Image bauen → `initialize` + `tools/list` hineinpipen →
`serverInfo` und exakt neun Tools verlangen. Ein kaputter Container fällt damit
bei uns auf, statt die Listung still zu verlieren.

Offen bleibt danach nur der Badge (siehe unten).

## 4. awesome-mcp-servers — PR #12245 offen, blockiert nur noch am Badge

Der Fork-Branch `add-getecoback-raumklima-mcp` ist gepusht, der PR vom Owner
eröffnet und der Text korrigiert. Stand: **All checks passed, keine Konflikte**,
Labels `has-emoji` ✅ `valid-name` ✅ **`missing-glama` ❌**.

Der Eintrag steht alphabetisch in *Environment & Nature* zwischen `atmospore`
und `nalediym` und verlinkt jetzt das **öffentliche Repo** (nicht mehr die
Doku-Seite — der Grund für die frühere Einschränkung ist mit
`f-tiger/getecoback-mcp` entfallen).

`missing-glama` verschwindet, sobald nach der Glama-Freigabe diese Zeile hinter
die Beschreibung gesetzt wird:

```markdown
[![f-tiger/getecoback-mcp MCP server](https://glama.ai/mcp/servers/f-tiger/getecoback-mcp/badges/score.svg)](https://glama.ai/mcp/servers/f-tiger/getecoback-mcp)
```

Bewusst **noch nicht** eingefügt: vor der Freigabe rendert der Badge als
kaputtes Bild, was ein Reviewer zu Recht negativ liest.

## 4b. npm — Paketname frei, Erstveröffentlichung braucht den Owner

`getecoback-mcp` ist auf npm nicht vergeben (Registry antwortet 404).
`.github/workflows/publish.yml` liegt bereit und läuft bei einem GitHub-Release;
vor dem Publish wird der Parity-Test ausgeführt, damit keine Version rausgeht,
die anders rechnet als der gehostete Server.

**Warum es trotzdem eine Owner-Aktion bleibt:** npm erlaubt Trusted Publishing
(OIDC) nur für ein Paket, das **bereits existiert** — die erste Veröffentlichung
braucht zwingend ein klassisches Token. Ablauf: `NPM_TOKEN` als Repo-Secret →
Release anlegen → danach auf npmjs.com den Trusted Publisher konfigurieren und
das Secret wieder löschen.

Bis dahin ist die dokumentierte Installation `npx github:f-tiger/getecoback-mcp`
— **end-to-end verifiziert** (initialize + tools/list, alle neun Tools), im
Gegensatz zu dem `npx getecoback-mcp`, das vorher in der README stand und ins
Leere lief.

## 5. Bewusst nicht eingereicht

Verzeichnisse, die eine npm-/PyPI-Installation oder ein öffentliches Repo
zwingend voraussetzen, werden erst nach der Entscheidung aus Abschnitt 4
sinnvoll — ein Eintrag, der auf ein 404 zeigt, schadet mehr als er nützt.

## 6. Messung

Einziger Beweis für echte Nutzung bleibt `mcp_call` in D1, ohne CI-Zeilen und
ohne den täglichen Indexer (erkennbar an identischen Argumenten zur selben
Stunde). `mcp_install_click` misst die Doku-Seite. Beide Abfragen stehen in
`docs/analytics-first-party-d1.md`.

---

## Nachtrag 2026-08-16: das Muster aus der agiscorecard-Session übernommen

Der Owner wies darauf hin, dass dieselbe Aufgabe in der agiscorecard-Session
bereits gelöst wurde. Die Repo-Liste dieses Kontos bestätigt es — und liefert
die Antwort auf die oben offene Frage:

- `f-tiger/agiscorecard-mcp` — **öffentlich**, ein Spiegel-Repo mit
  `glama.json`, `server.json`, Lizenz und einem täglichen `sync.mjs`.
- `f-tiger/awesome-mcp-servers` — **öffentlicher Fork** für den PR.

**Der entscheidende Fund ist `glama.json`.** Glama indexiert GitHub-Repos; eine
`glama.json` mit `maintainers: ["f-tiger"]` beansprucht den Eintrag direkt im
Repo. Damit ist der oben beschriebene Umweg über das (hier egress-blockierte)
Web-Formular **nicht mehr nötig** — Abschnitt 3 ist durch diesen Weg ersetzt.

### Übernommen

`mcp/public-mirror/` enthält den vollständigen Inhalt für ein öffentliches
`f-tiger/getecoback-mcp`: README (Tool-Tabelle **generiert**, nicht getippt),
`glama.json`, `server.json`, CC-BY-4.0-Lizenz, `sync.mjs` + täglicher Workflow.
Gegengeprüft: die handgeschriebene Tabelle ist **byte-identisch** mit dem, was
`sync.mjs` aus den Live-Tool-Definitionen erzeugt — der erste Sync ist also ein
No-op, die README stimmt heute.

### Bewusst *nicht* übernommen: der Namensraum

agiscorecard nutzt `com.agiscorecard/agi-scorecard` (DNS-Namensraum). Hier
bleibt es bei `io.github.f-tiger/hvac-btu-heat-klimaanlage`, aus zwei Gründen:
Die Registry-Suche matcht **nur Namens-Substrings**, und dieser Name trägt
genau die Suchwörter (`btu`, `hvac`, `heat`, `klima`), die vorher auf
Konkurrenzdichte geprüft wurden. Und eine Umbenennung verlangt eine **neue
Remote-URL** (Regel ③: „deprecated" Einträge halten ihre URL weiter), also einen
Umzug des laufenden Endpunkts. Der Namensraum wäre Kosmetik zum Preis eines
Bruchs.

### Stand jetzt

| Schritt | Status |
|---|---|
| Offizielles Registry v1.1.0 | erledigt, per API verifiziert |
| Produktions-Smoke-Test aller 9 Tools | erledigt, grün |
| Spiegel-Repo-Inhalt inkl. Glama-Claim | fertig in `mcp/public-mirror/` |
| awesome-mcp-servers Eintrag | committet und gepusht auf Fork-Branch `add-getecoback-raumklima-mcp` |
| **Öffentliches Repo `f-tiger/getecoback-mcp`** | **blockiert:** `create_repository` → 403 „Resource not accessible by integration" |
| PR gegen punkpeye/awesome-mcp-servers | wartet auf das Repo (sonst zeigt der Eintrag auf 404) |

**Reihenfolge, die einzuhalten ist:** erst das leere öffentliche Repo anlegen →
ich pushe `mcp/public-mirror/` hinein → dann erst den PR öffnen.
