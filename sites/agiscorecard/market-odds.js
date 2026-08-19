/* Live prediction-market odds, fetched client-side on demand.
 *
 * Design constraints (deliberate):
 *  - Data NEVER passes through our server. The visitor's browser calls Polymarket
 *    directly and we render the response verbatim — never cached, edited, or
 *    estimated. This is the site's zero-fabrication rule applied to third-party data.
 *  - Click-to-load, not auto-load: no white screen where Polymarket is blocked, no
 *    visitor IP disclosed before consent, and no cost on pages nobody asks it for.
 *  - Defensive parsing: the response is walked recursively for anything carrying both
 *    a question and outcome prices, so an API shape change degrades to "nothing found"
 *    instead of breaking the page.
 *
 * Usage: <div class="mkt-block" data-mkt-queries="AGI|superintelligence"></div>
 *        <script src="/market-odds.js" defer></script>
 */
(function () {
  var DEFAULT_QUERIES = [
    'AGI',
    'artificial general intelligence',
    'superintelligence',
    'OpenAI AGI'
  ];
  var MAX_ROWS = 5;

  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }

  function collect(node, out, depth) {
    if (!node || depth > 6 || out.length > 120) return;
    if (Array.isArray(node)) {
      node.forEach(function (n) { collect(n, out, depth + 1); });
      return;
    }
    if (typeof node !== 'object') return;
    var q = node.question || node.title;
    var p = node.outcomePrices || node.outcome_prices;
    if (q && p) out.push(node);
    Object.keys(node).forEach(function (k) {
      var v = node[k];
      if (v && typeof v === 'object') collect(v, out, depth + 1);
    });
  }

  function prices(m) {
    var raw = m.outcomePrices || m.outcome_prices;
    var arr = raw;
    if (typeof raw === 'string') {
      try { arr = JSON.parse(raw); } catch (e) { return null; }
    }
    if (!Array.isArray(arr) || !arr.length) return null;
    var names = m.outcomes;
    if (typeof names === 'string') {
      try { names = JSON.parse(names); } catch (e) { names = null; }
    }
    var vals = arr.map(Number);
    if (!isFinite(vals[0])) return null;
    return { names: Array.isArray(names) ? names : null, vals: vals };
  }

  function track(event, loc) {
    if (typeof gtag === 'function') gtag('event', event, { location: loc });
  }

  async function load(block) {
    var loc = block.getAttribute('data-mkt-loc') || 'page';
    var queries = (block.getAttribute('data-mkt-queries') || '').split('|').filter(Boolean);
    if (!queries.length) queries = DEFAULT_QUERIES;

    var btn = block.querySelector('.mkt-btn');
    var out = block.querySelector('.mkt-out');
    btn.disabled = true;
    btn.style.opacity = 0.6;
    btn.textContent = 'Loading…';
    track('market_odds_load', loc);

    var found = [];
    var reached = false;
    for (var i = 0; i < queries.length; i++) {
      try {
        var r = await fetch(
          'https://gamma-api.polymarket.com/public-search?q=' +
            encodeURIComponent(queries[i]) + '&limit_per_type=12',
          { mode: 'cors' }
        );
        if (!r.ok) continue;
        reached = true;
        collect(await r.json(), found, 0);
      } catch (e) { /* keep trying the remaining queries */ }
    }

    if (!reached) {
      out.innerHTML = '<p style="margin:0;font-size:13.5px;color:var(--muted)">Could not reach Polymarket from your network — some regions and networks block it. The markets are at <a href="https://polymarket.com" target="_blank" rel="noopener nofollow">polymarket.com</a>.</p>';
      btn.style.display = 'none';
      return;
    }

    var seen = {}, rows = [];
    found.forEach(function (m) {
      var key = m.slug || m.question || m.title;
      if (!key || seen[key]) return;
      if (m.closed === true || m.active === false || m.archived === true) return;
      var pr = prices(m);
      if (!pr) return;
      seen[key] = 1;
      rows.push({
        q: m.question || m.title,
        slug: m.slug,
        pr: pr,
        vol: Number(m.volume || m.volumeNum || m.volume24hr || 0)
      });
    });
    rows.sort(function (a, b) { return b.vol - a.vol; });
    rows = rows.slice(0, MAX_ROWS);

    if (!rows.length) {
      out.innerHTML = '<p style="margin:0;font-size:13.5px;color:var(--muted)">No open AGI-related markets came back just now — these markets open and close. Check <a href="https://polymarket.com" target="_blank" rel="noopener nofollow">polymarket.com</a> directly.</p>';
      btn.style.display = 'none';
      return;
    }

    var html = rows.map(function (r) {
      var yes = r.pr.vals[0];
      var label = (r.pr.names && r.pr.names[0]) || 'Outcome 1';
      var pct = (yes * 100).toFixed(0);
      var url = r.slug ? 'https://polymarket.com/market/' + encodeURIComponent(r.slug) : 'https://polymarket.com';
      return '<div style="display:flex;justify-content:space-between;gap:14px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<a href="' + url + '" target="_blank" rel="noopener nofollow" data-mkt-link="1" style="font-size:14px;line-height:1.45;">' + esc(r.q) + '</a>' +
        '<span style="font-family:var(--mono,monospace);font-size:19px;font-weight:700;color:var(--accent2);white-space:nowrap;">' +
        pct + '%<span style="font-size:11px;color:var(--muted);font-weight:400;"> ' + esc(label) + '</span></span></div>';
    }).join('');

    out.innerHTML = html +
      '<p style="margin:10px 0 0;font-size:12px;color:var(--muted)">Fetched by your browser at ' +
      esc(new Date().toLocaleString()) +
      ' · source: <a href="https://polymarket.com" target="_blank" rel="noopener nofollow">Polymarket</a>. Prices move continuously; reload to refresh.</p>';
    btn.style.display = 'none';

    out.querySelectorAll('[data-mkt-link]').forEach(function (a) {
      a.addEventListener('click', function () { track('market_click', loc); });
    });
  }

  function init() {
    document.querySelectorAll('.mkt-block').forEach(function (block) {
      if (block.querySelector('.mkt-btn')) return;
      var label = block.getAttribute('data-mkt-label') || 'Load live market odds →';
      block.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
        '<button class="mkt-btn" style="background:var(--accent);color:#fff;border:0;border-radius:8px;padding:9px 18px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;">' +
        esc(label) + '</button>' +
        '<span style="font-size:12.5px;color:var(--muted);">Loads directly from Polymarket in your browser. Nothing is requested until you click.</span>' +
        '</div><div class="mkt-out" style="margin-top:14px;"></div>';
      block.querySelector('.mkt-btn').addEventListener('click', function () { load(block); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
