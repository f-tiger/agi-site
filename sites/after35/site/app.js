// 三十五后 前端:事件上报 + 经验卡渲染 + 联系方式按需取。无框架、无账号、无第三方脚本。
(function () {
  const PATH = location.pathname;
  function ev(n, l) {
    try { navigator.sendBeacon("/e", new Blob([JSON.stringify({ n: n, l: l || "", p: PATH })], { type: "application/json" })); } catch (e) {}
  }
  window.a35ev = ev;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function renderCard(c) {
    const kindLabel = c.kind === "need" ? "找有经验的人" : c.kind === "team" ? "找合伙人" : "我有经验";
    const ST = { idea: "想法阶段", validated: "已有人付钱", revenue: "已有收入" }, CM = { parttime: "兼职起步", fulltime: "全职" };
    const yrs = c.kind === "offer" ? "<span>" + esc(c.years) + " 年 · " + esc(c.field) + "</span>" : "<span>" + esc(c.field) + "</span>";
    const ind = c.industry ? "<span>" + esc(c.industry) + "</span>" : "";
    const intro = c.intro ? '<span class="intro">先免费聊半小时</span>' : "";
    const match = c.industry ? '<a class="match" href="/cards?kind=' + (c.kind === "offer" ? "need" : "offer") + "&industry=" + encodeURIComponent(c.industry) + '" data-ev="match_click" data-l="' + esc(c.kind) + '">' + (c.kind === "need" ? "看同行业能帮忙的人 →" : c.kind === "team" ? "看同行业有经验的人 →" : "看同行业在找人的需求 →") + "</a>" : "";
    const teamMeta = c.kind === "team" ? "<span>" + esc(ST[c.stage] || "") + "</span><span>" + esc(CM[c.commit] || "") + "</span>" : "";
    return '<article class="card" data-id="' + c.id + '" data-industry="' + esc(c.industry) + '">' +
      '<div class="meta"><span class="kind ' + esc(c.kind) + '">' + kindLabel + "</span>" + yrs + ind + teamMeta + "<span>" + esc(c.city) + "</span><span>" + esc(c.age) + " 岁</span></div>" +
      "<h3>" + esc(c.headline) + "</h3>" +
      '<div class="body">' + esc(c.body) + "</div>" +
      '<div class="tags">' + intro + (c.kind === "team" ? '<span class="need-role">找:</span>' : "") + c.offers.map(function (o) { return "<span>" + esc(o) + "</span>"; }).join("") + "</div>" +
      (match ? '<div class="small">' + match + "</div>" : "") +
      '<div class="foot"><span class="pay">' + esc(c.pay) + '</span><span class="muted small">' + esc(c.nick) + " · " + esc(String(c.created).slice(0, 10)) + '</span><button class="aimatch" type="button">AI 找匹配</button><button class="reveal" type="button">查看联系方式</button></div>' +
      '<div class="mbox" hidden></div>' +
      "</article>";
  }

  function renderMatches(box, j, forKind) {
    if (!j || !j.ok) { box.innerHTML = '<div class="small muted">暂时算不出来,稍后再试。</div>'; return; }
    if (!j.matches.length) { box.innerHTML = '<div class="small muted">' + (j.pool ? "现有的 " + j.pool + " 张卡里没有足够接近的。" : "对面还没有卡。") + ' 卡越多匹配越准——把这个站发给同行。' + (j.ai ? "" : "(语义匹配暂不可用,按用词重叠排)") + "</div>"; return; }
    box.innerHTML = '<div class="small muted" style="margin-bottom:6px">' + (j.ai ? "AI 语义匹配" : "按用词重叠") + ',按接近程度排,理由逐条列出:</div>' +
      j.matches.map(function (m) {
        return '<div class="mrow"><a href="/cards?focus=' + m.id + '" data-ev="match_click" data-l="ai:' + esc(forKind) + '"><b>' + esc(m.headline) + "</b></a><div class='small muted'>" + esc(m.kind === "need" ? "找有经验的人" : m.kind === "team" ? "找合伙人" : "我有经验") + " · " + esc(m.city) + (m.industry ? " · " + esc(m.industry) : "") + "</div><div class='reasons'>" + m.reasons.map(function (r) { return "<span>" + esc(r) + "</span>"; }).join("") + "</div></div>";
      }).join("");
  }
  window.a35renderMatches = renderMatches;
  window.a35matchText = function (q, box, kind) {
    box.innerHTML = '<div class="small muted">AI 在读现有的卡…</div>';
    return fetch("/api/match/text?q=" + encodeURIComponent(q) + (kind ? "&kind=" + kind : "")).then(function (r) { return r.json(); }).then(function (j) { ev("ai_match_open", "text"); renderMatches(box, j, "text"); return j; }).catch(function () { renderMatches(box, null); });
  };

  function mountCards(el, cards, emptyHtml) {
    if (!cards.length) { el.innerHTML = emptyHtml; return; }
    el.innerHTML = cards.map(renderCard).join("");
    el.querySelectorAll(".aimatch").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const art = btn.closest(".card"); const id = art.getAttribute("data-id"); const box = art.querySelector(".mbox");
        if (!box.hidden) { box.hidden = true; btn.textContent = "AI 找匹配"; return; }
        box.hidden = false; box.innerHTML = '<div class="small muted">AI 在读现有的卡…</div>'; btn.textContent = "收起";
        fetch("/api/match?id=" + id).then(function (r) { return r.json(); }).then(function (j) { ev("ai_match_open", "card"); renderMatches(box, j, j && j.for ? j.for.kind : ""); }).catch(function () { renderMatches(box, null); });
      });
    });
    el.querySelectorAll(".reveal").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const art = btn.closest(".card"); const id = art.getAttribute("data-id");
        btn.disabled = true; btn.textContent = "取回中…";
        fetch("/api/card/" + id + "/contact").then(function (r) { return r.json(); }).then(function (j) {
          if (j.ok) { btn.outerHTML = '<span class="contact">' + esc(j.contact) + "</span>"; ev("contact_reveal", id); }
          else { btn.textContent = "这张卡已下线"; }
        }).catch(function () { btn.disabled = false; btn.textContent = "查看联系方式"; });
      });
    });
  }

  window.a35loadCards = function (el, opts) {
    opts = opts || {};
    const q = [];
    if (opts.kind) q.push("kind=" + opts.kind);
    if (opts.limit) q.push("limit=" + opts.limit);
    return fetch("/api/cards" + (q.length ? "?" + q.join("&") : "")).then(function (r) { return r.json(); }).then(function (j) {
      let cards = (j && j.cards) || [];
      if (opts.filter) cards = cards.filter(opts.filter);
      const focus = new URLSearchParams(location.search).get("focus");
      if (focus && cards.some(function (c) { return String(c.id) === focus; })) { cards = cards.filter(function (c) { return String(c.id) === focus; }).concat(cards.filter(function (c) { return String(c.id) !== focus; })); }
      mountCards(el, cards, opts.empty || '<div class="empty"><b>这里还没有第一张卡。</b>没有一张是编出来的——你可以成为第一个。<br><a class="cta primary" style="margin-top:14px" href="/post">发一张经验卡</a></div>');
      return cards;
    }).catch(function () {
      el.innerHTML = '<div class="empty"><b>暂时取不到卡片。</b>刷新一次,还不行就稍后再来。</div>';
      return [];
    });
  };

  window.a35stats = function () {
    fetch("/api/stats").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) return;
      document.querySelectorAll("[data-stat]").forEach(function (el) { const k = el.getAttribute("data-stat"); if (k in j) el.textContent = j[k]; });
    }).catch(function () {});
  };

  document.addEventListener("click", function (e) {
    const a = e.target.closest("a[data-ev]");
    if (a) ev(a.getAttribute("data-ev"), a.getAttribute("data-l") || a.getAttribute("href"));
  });

  window.a35share = function (title) {
    const url = location.origin + PATH;
    if (navigator.share) { navigator.share({ title: title, url: url }).then(function () { ev("share_click", "native"); }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { ev("share_click", "copy"); alert("链接已复制:" + url); }).catch(function () { prompt("复制这个链接:", url); });
  };
})();
