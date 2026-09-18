/* Task plans use the site's existing facts. No account, external request or user text. */
(function () {
  'use strict';
  var config = JSON.parse(document.getElementById('stackData').textContent);
  var ZH = config.zh, D = config.pool, LAB = config.labels, LVB = config.verdicts;
  var cats = config.categories, BIZ = ['image', 'video', 'audio', 'design'];
  var params = new URLSearchParams(location.search);
  var selected = params.has('tasks') ? params.get('tasks').split(',').filter(function (c) { return cats.includes(c); }) : ['writing', 'image', 'video'];
  var flags = { cn: params.get('cn') === '1', commercial: params.get('commercial') === '1', free: params.get('free') !== '0' };
  var current = [], timer;
  var byId = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function ev(name, path) { if (window.bpjEv) window.bpjEv(name, path); }
  function ordered() { return cats.filter(function (c) { return selected.includes(c); }); }
  function link() {
    var url = new URL(location.pathname, location.origin);
    url.searchParams.set('tasks', ordered().join(','));
    if (flags.cn) url.searchParams.set('cn', '1');
    if (flags.commercial) url.searchParams.set('commercial', '1');
    if (!flags.free) url.searchParams.set('free', '0');
    return url.href;
  }
  function pick(cat) {
    return D.filter(function (t) {
      return t.c === cat && t.lv !== 'discontinued' && (!flags.cn || t.cn) &&
        (!flags.commercial || !BIZ.includes(cat) || ['yes', 'conditional'].includes(t.lv));
    }).sort(function (a, b) {
      function score(t) { return t.free * (flags.free ? 4 : 1) + (t.q ? 2 : 0) + t.hot + (flags.commercial && BIZ.includes(cat) ? (t.lv === 'yes' ? 6 : 2) : 0); }
      return score(b) - score(a) || a.s.localeCompare(b.s);
    }).slice(0, 3);
  }
  function render(userAction) {
    current = [];
    var chosen = ordered(), html = '';
    document.querySelectorAll('#stackCats button').forEach(function (b) {
      var on = selected.includes(b.dataset.c); b.classList.toggle('is-sel', on); b.setAttribute('aria-pressed', String(on));
    });
    [['fCn', 'cn'], ['fBiz', 'commercial'], ['fFree', 'free']].forEach(function (pair) {
      byId(pair[0]).classList.toggle('is-sel', flags[pair[1]]); byId(pair[0]).setAttribute('aria-pressed', String(flags[pair[1]]));
    });
    chosen.forEach(function (cat) {
      var rows = pick(cat);
      html += '<h3 class="calc-h">' + esc(LAB[cat]) + '<em>' + rows.length + '</em></h3>';
      if (!rows.length) html += '<p class="gs-none">' + (ZH ? '当前资料中没有符合条件的项，请放宽筛选或查看完整目录。' : 'No matching records. Try broader filters or the full directory.') + '</p>';
      rows.forEach(function (t, i) {
        current.push(t);
        var v = LVB[t.lv] || LVB[''];
        var badge = flags.commercial && BIZ.includes(cat) ? '<span class="verdict ' + esc(v[1]) + '">' + esc(v[0]) + '</span> ' : '';
        html += '<div class="calc-row ' + (i === 0 ? 'calc-ok' : 'calc-un') + '" data-stack-tool="' + esc(t.s) + '">' +
          '<b><a href="' + config.base + '/tools/' + esc(t.s) + '.html">' + esc(t.n) + '</a></b> ' + badge +
          '<span class="calc-v">' + (t.free ? (ZH ? '完全免费' : 'Fully free') : (ZH ? '含免费档' : 'Free tier available')) + '</span>' +
          '<p>' + esc(t.q ? t.q.slice(0, 160) + (t.q.length > 160 ? '…' : '') : (ZH ? '未查到官方额度数字，使用前请核对工具页。' : 'No sourced allowance found. Check the tool page before use.')) + '</p>' +
          (t.chk ? '<i>' + (ZH ? '核实于 ' : 'Checked ') + esc(t.chk) + '</i>' : '') + '</div>';
      });
    });
    byId('stackOut').innerHTML = html || '<p>' + (ZH ? '请选择至少一个任务。' : 'Choose at least one task.') + '</p>';
    byId('stackDownload').disabled = !current.length;
    byId('stackCopy').disabled = !chosen.length;
    byId('stackStatus').textContent = '';
    byId('stackShareFallback').hidden = true;
    try { history.replaceState(null, '', link()); } catch (e) { /* URL updates are optional. */ }
    clearTimeout(timer);
    // Initial rendering, shared-link loading and empty results are not tool use.
    if (userAction && current.length) timer = setTimeout(function () { ev('calc', '/stack/' + chosen.join('-') + (flags.commercial ? '+biz' : '') + (flags.cn ? '+cn' : '')); }, 500);
  }
  document.querySelectorAll('#stackCats button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      selected = selected.includes(b.dataset.c) ? selected.filter(function (c) { return c !== b.dataset.c; }) : selected.concat(b.dataset.c);
      render(e.isTrusted);
    });
  });
  [['fCn', 'cn'], ['fBiz', 'commercial'], ['fFree', 'free']].forEach(function (pair) {
    byId(pair[0]).addEventListener('click', function (e) { flags[pair[1]] = !flags[pair[1]]; render(e.isTrusted); });
  });
  byId('stackCopy').addEventListener('click', async function (e) {
    var url = link();
    try {
      await navigator.clipboard.writeText(url);
      byId('stackStatus').textContent = ZH ? '链接已复制。接收方无需注册。' : 'Link copied. Recipients need no account.';
    } catch (error) {
      var field = byId('stackShareFallback'); field.value = url; field.hidden = false; field.focus(); field.select();
      byId('stackStatus').textContent = ZH ? '请复制下方已选中的链接。' : 'Copy the selected link below.';
    }
    if (e.isTrusted) ev('gate', '/gate/stack-share/stack-builder');
  });
  byId('stackDownload').addEventListener('click', function (e) {
    var lines = [ZH ? '白嫖计 · 我的 AI 工具方案' : 'Baipiaoji · My AI tool plan', link(), '',
      ZH ? '资料快照：免费档与条件可能变化。请核对工具页来源和日期。有条件商用不等于无条件授权。' : 'Data snapshot: tiers and terms can change. Check sources and dates on each tool page. Conditional commercial use is not unrestricted permission.', ''];
    current.forEach(function (t) {
      lines.push(LAB[t.c] + ' — ' + t.n, config.base + '/tools/' + t.s + '.html', t.q || (ZH ? '额度未核实' : 'Allowance unverified'),
        (ZH ? '核实日期：' : 'Checked: ') + (t.chk || '—'), (ZH ? '来源：' : 'Source: ') + (t.source || '—'),
        (ZH ? '授权：' : 'Licence: ') + (LVB[t.lv] || LVB[''])[0], '');
    });
    var url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'my-ai-tool-plan.txt'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    byId('stackStatus').textContent = ZH ? '清单已生成，无需邮箱。' : 'Your list is ready. No email needed.';
    if (e.isTrusted) ev('gate', '/gate/stack-export/stack-builder');
  });
  render(false);
})();
