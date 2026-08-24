/* Copy-paste embed block: the fleet's one proven zero-labor backlink engine
   (utm_source=widget). Button + beacon only; the static line is the no-JS
   fallback. */
(function () {
  var btn = document.getElementById("embedcopy");
  if (!btn) return;
  var zh = (document.documentElement.lang || "").indexOf("zh") === 0 || /-zh\.html$|\/zh(\/|$)/.test(location.pathname);
  btn.addEventListener("click", function () {
    var base = location.origin + location.pathname.replace(/\.html$/, "").replace(/-zh$/, zh ? "-zh" : "");
    var code = '<iframe src="' + location.origin + location.pathname + '?embed=1" width="400" height="560" style="border:1px solid #ddd;border-radius:12px" loading="lazy" title="Gridlings — daily logic puzzle"></iframe>\n' +
      '<p><a href="' + base + '?utm_source=widget">' + (zh ? "Gridlings 格灵——每日逻辑谜题,纯推理可解" : "Gridlings — daily logic puzzles, solvable without guessing") + "</a></p>";
    function ok() {
      btn.textContent = zh ? "✓ 已复制" : "✓ Copied";
      try { navigator.sendBeacon("/e", JSON.stringify({ n: "embed_copy", l: location.pathname.slice(0, 80), p: location.pathname.slice(0, 80) })); } catch (e) {}
    }
    function legacy() {
      var t = document.createElement("textarea"); t.value = code; document.body.appendChild(t); t.select();
      try { document.execCommand("copy") && ok(); } catch (e) {}
      t.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, legacy);
    else legacy();
  });
})();
