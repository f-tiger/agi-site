// 三十五后 前端:事件上报 + 经验卡渲染 + 联系方式按需取。无框架、无账号、无第三方脚本。
(function () {
  const PATH = location.pathname;
  function ev(n, l) {
    try { navigator.sendBeacon("/e", new Blob([JSON.stringify({ n: n, l: l || "", p: PATH })], { type: "application/json" })); } catch (e) {}
  }
  window.a35ev = ev;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function renderCard(c) {
    const kindLabel = c.kind === "need" ? "找有经验的人" : "我有经验";
    const yrs = c.kind === "offer" ? "<span>" + esc(c.years) + " 年 · " + esc(c.field) + "</span>" : "<span>" + esc(c.field) + "</span>";
    return '<article class="card" data-id="' + c.id + '">' +
      '<div class="meta"><span class="kind ' + esc(c.kind) + '">' + kindLabel + "</span>" + yrs + "<span>" + esc(c.city) + "</span><span>" + esc(c.age) + " 岁</span></div>" +
      "<h3>" + esc(c.headline) + "</h3>" +
      '<div class="body">' + esc(c.body) + "</div>" +
      '<div class="tags">' + c.offers.map(function (o) { return "<span>" + esc(o) + "</span>"; }).join("") + "</div>" +
      '<div class="foot"><span class="pay">' + esc(c.pay) + '</span><span class="muted small">' + esc(c.nick) + " · " + esc(String(c.created).slice(0, 10)) + '</span><button class="reveal" type="button">查看联系方式</button></div>' +
      "</article>";
  }

  function mountCards(el, cards, emptyHtml) {
    if (!cards.length) { el.innerHTML = emptyHtml; return; }
    el.innerHTML = cards.map(renderCard).join("");
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
