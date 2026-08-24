/* Shared copy helper for share/challenge (2026-08-24). Portal-context truth:
   in a cross-origin iframe navigator.clipboard.writeText is usually rejected,
   and prompt() is silently blocked by iframe sandboxes — the old fallback
   chain made the viral loop a no-op exactly where portal traffic arrives.
   Chain here: native share sheet (mobile) → async clipboard → legacy
   execCommand copy → visible selectable box (never prompt()). */
(function () {
  function legacy(txt) {
    return new Promise(function (res, rej) {
      try {
        var ta = document.createElement("textarea");
        ta.value = txt; ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.focus(); ta.select(); ta.setSelectionRange(0, txt.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? res() : rej(new Error("execCommand refused"));
      } catch (e) { rej(e); }
    });
  }
  window.glCopy = function (txt) {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      return navigator.share({ text: txt }).catch(function (e) {
        if (e && e.name === "AbortError") return; // user closed the sheet — not a failure
        return (navigator.clipboard && navigator.clipboard.writeText)
          ? navigator.clipboard.writeText(txt).catch(function () { return legacy(txt); })
          : legacy(txt);
      });
    }
    return (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(txt).catch(function () { return legacy(txt); })
      : legacy(txt);
  };
  window.glCopyShow = function (txt) {
    var box = document.getElementById("glcopybox");
    if (!box) {
      box = document.createElement("textarea");
      box.id = "glcopybox"; box.setAttribute("readonly", "");
      box.rows = 3;
      box.style.cssText = "width:100%;margin-top:8px;font-size:12px;padding:6px;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:inherit;color:inherit;resize:none";
      var host = document.getElementById("win") || document.body;
      host.appendChild(box);
    }
    box.value = txt; box.hidden = false;
    try { box.focus(); box.select(); box.setSelectionRange(0, txt.length); } catch (e) {}
  };
})();
