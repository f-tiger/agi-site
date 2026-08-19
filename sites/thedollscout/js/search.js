/* Site search.

   Injected by JavaScript rather than written into the HTML, deliberately. A
   search box that renders and then does nothing when a script fails is worse
   than no search box, and a crawler has no use for a widget it cannot
   operate — so the markup only exists once the thing behind it works.

   The index is fetched on first interaction, not on page load. It is ~27 KB
   and most visitors never search; making every reader pay for it would be
   charging everyone for a feature few use.

   Two result kinds. Pages are ordinary document hits. ANSWERS come from the
   published dataset, so typing "150cm" returns the measured weight range with
   its sample size rather than a page that happens to mention it. That data is
   the only thing here nobody else has, and putting it behind a document
   search would have wasted it. */
(function () {
  var index = null;
  var loading = null;

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch("/search-index.json")
        .then(function (r) { return r.ok ? r.json() : { entries: [] }; })
        .then(function (d) { index = d.entries || []; return index; })
        .catch(function () { index = []; return index; });
    }
    return loading;
  }

  /* Scoring is deliberately simple and explainable: a title hit beats a body
     hit, an exact-phrase hit beats scattered words, and a data answer wins a
     numeric query because "150cm" is a question about a measurement. */
  function score(entry, q, words) {
    var t = entry.title.toLowerCase();
    var terms = entry.terms || "";
    var s = 0;
    if (t.indexOf(q) !== -1) s += 100;
    if (terms.indexOf(q) !== -1) s += 40;
    for (var i = 0; i < words.length; i++) {
      if (t.indexOf(words[i]) !== -1) s += 12;
      else if (terms.indexOf(words[i]) !== -1) s += 4;
      else return 0; // every word must appear somewhere
    }
    if (entry.kind === "answer" && /\d/.test(q)) s += 60;
    /* Developer documentation is a real result but never the best one for a
       visitor's question. /mcp describes every tool, so it matches every tool's
       vocabulary and was tying with the page that actually answers. */
    if (entry.kind === "docs") s -= 30;
    return s > 0 ? s : 0;
  }

  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    var words = q.split(/\s+/).filter(Boolean);
    return (index || [])
      .map(function (e) { return { e: e, s: score(e, q, words) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 8)
      .map(function (r) { return r.e; });
  }

  function build() {
    var nav = document.querySelector(".site-header .wrap");
    if (!nav || document.getElementById("ds-search")) return;

    var box = document.createElement("div");
    box.className = "ds-search";
    box.innerHTML =
      '<label class="visually-hidden" for="ds-search">Search this site</label>' +
      '<input id="ds-search" type="search" placeholder="Search — try 150cm" autocomplete="off" ' +
      'role="combobox" aria-expanded="false" aria-controls="ds-search-results" aria-autocomplete="list">' +
      '<ul id="ds-search-results" role="listbox" hidden></ul>';
    nav.appendChild(box);

    var input = box.querySelector("input");
    var list = box.querySelector("ul");
    var active = -1;
    var current = [];

    function close() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      active = -1;
    }

    function render(results) {
      current = results;
      active = -1;
      if (!results.length) {
        list.innerHTML =
          '<li class="ds-none" role="option" aria-disabled="true">No match. Everything published is on ' +
          '<a href="/guides/">the guides index</a>.</li>';
      } else {
        list.innerHTML = results
          .map(function (r, i) {
            return (
              '<li role="option" id="ds-opt-' + i + '" aria-selected="false">' +
              '<a href="' + r.url + '">' +
              (r.kind === "answer" ? '<span class="ds-kind">data</span> ' : "") +
              '<b>' + r.title + '</b><span>' + (r.desc || "") + "</span></a></li>"
            );
          })
          .join("");
      }
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function move(delta) {
      if (list.hidden || !current.length) return;
      var opts = list.querySelectorAll('li[role="option"]:not([aria-disabled])');
      if (!opts.length) return;
      if (active >= 0) opts[active].setAttribute("aria-selected", "false");
      active = (active + delta + opts.length) % opts.length;
      opts[active].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", load);
    input.addEventListener("input", function () {
      if (!input.value.trim()) return close();
      load().then(function () { render(search(input.value)); });
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Escape") { close(); input.blur(); }
      else if (e.key === "Enter") {
        var opts = list.querySelectorAll('li[role="option"] a');
        if (active >= 0 && opts[active]) { e.preventDefault(); window.location.href = opts[active].href; }
      }
    });

    /* Closing on blur alone eats the click that lands on a result, so the
       click target is checked instead. */
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) close(); });

    /* "/" focuses search, the convention on documentation sites — but never
       while someone is typing into another field. */
    document.addEventListener("keydown", function (e) {
      var t = e.target.tagName;
      if (e.key === "/" && t !== "INPUT" && t !== "TEXTAREA" && !e.target.isContentEditable) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
