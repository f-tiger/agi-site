// The Power Bill — front end:事件上报 + 分享。无框架、无账号、无第三方脚本。
(function () {
  const PATH = location.pathname;
  function ev(n, l) { try { navigator.sendBeacon("/e", new Blob([JSON.stringify({ n: n, l: l || "", p: PATH })], { type: "application/json" })); } catch (e) {} }
  window.pbev = ev;
  document.addEventListener("click", function (e) { const a = e.target.closest("a[data-ev]"); if (a) ev(a.getAttribute("data-ev"), a.getAttribute("data-l") || a.getAttribute("href")); });
  document.addEventListener("toggle", function (e) { if (e.target.tagName === "DETAILS" && e.target.open) ev("faq_open", (e.target.querySelector("summary") || {}).textContent || ""); }, true);
  window.pbshare = function (title) {
    const url = location.href;
    if (navigator.share) { navigator.share({ title: title, url: url }).then(function () { ev("share_click", "native"); }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { ev("share_click", "copy"); alert("链接已复制:" + url); }).catch(function () { prompt("复制这个链接:", url); });
  };
})();
